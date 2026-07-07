import { NextResponse } from "next/server";
import { canSend } from "@/lib/otp-rate-limit";
import { generateCode, isEmailOtpConfigured, makeToken } from "@/lib/email-otp";

/**
 * Email OTP — send step. The browser POSTs { email }; we generate a 6-digit
 * code, forward { email, code } to the n8n Gmail workflow, and return only an
 * HMAC token (see lib/email-otp.ts). Same proxy pattern as app/api/chat.
 *
 * The CODE NEVER RETURNS TO THE BROWSER and is never logged — metadata only.
 *
 * Returns 503 when the webhook or secret isn't configured, so the client falls
 * back to its on-screen demo code and the app still runs without any secrets.
 */

const WEBHOOK_URL = process.env.N8N_EMAIL_WEBHOOK_URL;
const DEV = process.env.NODE_ENV !== "production";

// Log the domain only — never the full address or the code.
const domainOf = (email: string) => email.slice(email.indexOf("@") + 1) || "?";

export async function POST(req: Request) {
  if (!WEBHOOK_URL || !isEmailOtpConfigured()) {
    return NextResponse.json(
      { error: "Email OTP is not configured. Set N8N_EMAIL_WEBHOOK_URL and EMAIL_OTP_SECRET." },
      { status: 503 }
    );
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Throttle sends per email so no one can pump the mailbox / burn Gmail quota.
  const gate = canSend(`email-otp:${email}`);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 429 });
  }

  const code = generateCode();

  try {
    if (DEV) console.log("[api/email-otp/send] emailing code to domain:", domainOf(email));
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("email-otp webhook error", res.status, detail);
      return NextResponse.json({ error: "Couldn't send the code. Please try again." }, { status: 502 });
    }
  } catch (err) {
    console.error("Failed to reach email-otp webhook", err);
    return NextResponse.json({ error: "Couldn't reach the email service." }, { status: 502 });
  }

  // Token binds email + hash(code) + expiry; the code is not recoverable from it.
  return NextResponse.json({ token: makeToken(email, code) });
}
