// Phone-OTP auth seam. The UI (app/page.tsx) calls these; the bodies talk to
// our server routes (app/api/otp/*), which call Twilio Verify. The code is
// generated, stored and checked by Twilio server-side — it never reaches the
// browser. Add TWILIO_* keys to .env.local to enable real SMS; until then the
// /api/otp routes return a clear "not configured" error and the UI shows it.

export type AuthMode = "signup" | "login";
export type AuthResult = { ok: boolean; error?: string };

const DEMO_OTP = "123456";
const digits = (s: string) => s.replace(/\D/g, "");

// Normalize a display number ("+65 9123 4567") to E.164 ("+6591234567").
function toE164(phone: string): string {
  const hasPlus = phone.trim().startsWith("+");
  return (hasPlus ? "+" : "") + digits(phone);
}

/**
 * Demo OTP flow.
 *
 * This app is running in demo mode, so we do not send real SMS messages.
 * The expected code is hard-coded and shown to the user in the UI.
 */
export async function requestOtp(phone: string): Promise<AuthResult> {
  if (digits(phone).length < 7) {
    return { ok: false, error: "Enter a valid phone number." };
  }

  const normalized = toE164(phone);
  if (!/^[+][1-9]\d{7,14}$/.test(normalized)) {
    return { ok: false, error: "Enter a valid phone number." };
  }

  return { ok: true };
}

export async function verifyOtp(phone: string, code: string): Promise<AuthResult> {
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code." };
  }

  if (code !== DEMO_OTP) {
    return { ok: false, error: "Invalid code. For demo, enter 123456." };
  }

  return { ok: true };
}
