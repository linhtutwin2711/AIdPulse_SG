import { NextResponse } from "next/server";
import { isEmailOtpConfigured, verifyToken } from "@/lib/email-otp";

/**
 * Email OTP — verify step. The browser POSTs { email, code, token }; we
 * recompute the HMAC from (email, hash(code), expiry-in-token) and constant-time
 * compare. Stateless — no database.
 *
 * A wrong or expired code is a normal outcome, so it returns HTTP 200 with
 * { ok: false } (not an error status). The client uses that to tell "wrong
 * code" apart from "route missing / not configured" (404 / 503 → demo path).
 */

export async function POST(req: Request) {
  let body: { email?: string; code?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const code = body.code?.trim();
  const token = body.token;
  if (!email || !code || !token) {
    return NextResponse.json({ ok: false, error: "Missing email, code, or token." }, { status: 400 });
  }

  if (!isEmailOtpConfigured()) {
    return NextResponse.json({ ok: false, error: "Email OTP is not configured." }, { status: 503 });
  }

  const result = verifyToken(email, code, token);
  if (!result.ok) {
    // Expected failure (wrong/expired) — 200 so the client shows the reason
    // inline instead of falling back to the demo path.
    return NextResponse.json({ ok: false, error: result.reason });
  }
  return NextResponse.json({ ok: true });
}
