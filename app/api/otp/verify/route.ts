import { NextResponse } from "next/server";

/**
 * Check the 6-digit code the user typed against Twilio Verify. The code is sent
 * to the server here and validated server-side — the browser never decides
 * whether verification passed. Twilio returns status "approved" on a correct,
 * unexpired code (and enforces its own attempt cap).
 */

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SERVICE = process.env.TWILIO_VERIFY_SERVICE_SID;
const configured = Boolean(SID && TOKEN && SERVICE);

// Mirror of the send route's dev bypass (see app/api/otp/send/route.ts).
const devBypass = process.env.OTP_DEV_BYPASS === "true";
const DEV_CODE = process.env.OTP_DEV_CODE || "000000";

const E164 = /^\+[1-9]\d{7,14}$/;

export async function POST(req: Request) {
  let body: { phone?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const phone = body.phone?.trim() ?? "";
  const code = body.code?.trim() ?? "";
  if (!E164.test(phone) || !/^\d{4,8}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  if (devBypass) {
    if (code === DEV_CODE) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: `Dev mode — enter ${DEV_CODE}.` }, { status: 401 });
  }

  if (!configured) {
    return NextResponse.json({ error: "SMS verification is not configured." }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${SERVICE}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${SID}:${TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phone, Code: code }),
        cache: "no-store",
      },
    );

    // Twilio replies 200 with { status: "approved" } on success; once a code is
    // consumed or expired the verification resource is gone (404 / non-approved).
    const data = (await res.json().catch(() => ({}))) as { status?: string };
    if (res.ok && data.status === "approved") {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Incorrect or expired code." }, { status: 401 });
  } catch (err) {
    console.error("[api/otp/verify] failed", err);
    return NextResponse.json({ error: "Couldn't verify the code. Please try again." }, { status: 502 });
  }
}
