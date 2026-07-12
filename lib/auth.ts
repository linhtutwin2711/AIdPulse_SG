// Phone-OTP auth seam. The UI (app/page.tsx) calls these; the bodies talk to
// our server routes (app/api/otp/*), which call Twilio Verify. The code is
// generated, stored and checked by Twilio server-side — it never reaches the
// browser. If the TWILIO_* keys are missing (503) or the network is down, the
// flow falls back to the on-screen demo code so the app always works.

export type AuthMode = "signup" | "login";
export type AuthResult = { ok: boolean; error?: string; demo?: boolean };

const DEMO_OTP = "123456";
const digits = (s: string) => s.replace(/\D/g, "");

// Whether the current OTP round is running on the demo code (no SMS went out).
// Set by requestOtp, read by verifyOtp — one sign-in flow runs at a time.
let demoMode = true;

// Normalize a display number ("+65 9123 4567") to E.164 ("+6591234567").
function toE164(phone: string): string {
  const hasPlus = phone.trim().startsWith("+");
  return (hasPlus ? "+" : "") + digits(phone);
}

export async function requestOtp(phone: string): Promise<AuthResult> {
  if (digits(phone).length < 7) {
    return { ok: false, error: "Enter a valid phone number." };
  }

  const normalized = toE164(phone);
  if (!/^[+][1-9]\d{7,14}$/.test(normalized)) {
    return { ok: false, error: "Enter a valid phone number." };
  }

  try {
    const res = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalized }),
    });

    if (res.ok) {
      // Real SMS is on its way via Twilio.
      demoMode = false;
      return { ok: true, demo: false };
    }

    if (res.status === 503) {
      // Twilio not configured — demo path, code shown in the UI.
      demoMode = true;
      return { ok: true, demo: true };
    }

    // 400 bad number / 429 rate-limited / 502 Twilio error — surface it.
    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: error ?? "Couldn't send the code. Please try again." };
  } catch {
    // Network failure (offline dev) — demo path keeps the app usable.
    demoMode = true;
    return { ok: true, demo: true };
  }
}

export async function verifyOtp(phone: string, code: string): Promise<AuthResult> {
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code." };
  }

  if (demoMode) {
    if (code !== DEMO_OTP) {
      return { ok: false, error: "Invalid code. For demo, enter 123456." };
    }
    return { ok: true };
  }

  try {
    const res = await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: toE164(phone), code }),
    });

    if (res.ok) return { ok: true };

    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: error ?? "Incorrect or expired code." };
  } catch {
    return { ok: false, error: "Couldn't verify the code. Please try again." };
  }
}
