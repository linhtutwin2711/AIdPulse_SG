import { NextResponse } from "next/server";
import { canSend } from "@/lib/otp-rate-limit";

/**
 * Start phone verification for citizen sign-up / login: ask Twilio Verify to
 * SMS a one-time code to the number the user entered. We call the Twilio REST
 * API directly with fetch + Basic auth — no SDK dependency, same proxy style as
 * app/api/chat.
 *
 * Twilio owns the code: it generates, stores (hashed), expires (~10 min) and
 * caps attempts on it. We never see or store the code itself.
 *
 * The phone comes from the client here (the user is proving they own the number
 * they typed), so we validate the E.164 shape and rate-limit per number + IP to
 * blunt SMS-pumping / toll-fraud abuse.
 *
 * Required env (.env.local):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID
 */

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SERVICE = process.env.TWILIO_VERIFY_SERVICE_SID;
const configured = Boolean(SID && TOKEN && SERVICE);

// E.164: a leading + then 8–15 digits (covers SG +65######## and intl numbers).
const E164 = /^\+[1-9]\d{7,14}$/;

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const phone = body.phone?.trim() ?? "";
  if (!E164.test(phone)) {
    return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  }

  if (!configured) {
    return NextResponse.json(
      { error: "SMS verification is not configured. Add TWILIO_* keys to .env.local." },
      { status: 503 },
    );
  }

  const gate = canSend(`${phone}:${clientIp(req)}`);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 429 });
  }

  try {
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${SERVICE}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${SID}:${TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phone, Channel: "sms" }),
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[api/otp/send] twilio error", res.status, detail);
      return NextResponse.json({ error: "Couldn't send the code. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/otp/send] failed", err);
    return NextResponse.json({ error: "Couldn't send the code. Please try again." }, { status: 502 });
  }
}
