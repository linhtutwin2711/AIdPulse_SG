// Phone-OTP auth seam. The UI (app/page.tsx) calls these; the bodies talk to
// our server routes (app/api/otp/*), which call Twilio Verify. The code is
// generated, stored and checked by Twilio server-side — it never reaches the
// browser. Add TWILIO_* keys to .env.local to enable real SMS; until then the
// /api/otp routes return a clear "not configured" error and the UI shows it.

export type AuthMode = "signup" | "login";
// `devBypass` is set by /api/otp/send when OTP_DEV_BYPASS=true so the UI can
// hint which fixed code to enter (no real SMS was sent).
export type AuthResult = { ok: boolean; error?: string; devBypass?: boolean };

const digits = (s: string) => s.replace(/\D/g, "");

// Normalize a display number ("+65 9123 4567") to E.164 ("+6591234567").
function toE164(phone: string): string {
  const hasPlus = phone.trim().startsWith("+");
  return (hasPlus ? "+" : "") + digits(phone);
}

/** Send a one-time code to the phone number via Twilio Verify. */
export async function requestOtp(phone: string): Promise<AuthResult> {
  // Cheap client-side guard for instant feedback before hitting the network.
  if (digits(phone).length < 7) {
    return { ok: false, error: "Enter a valid phone number." };
  }
  try {
    const res = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: toE164(phone) }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; devBypass?: boolean };
    if (!res.ok) return { ok: false, error: data.error ?? "Couldn't send the code." };
    return { ok: true, devBypass: data.devBypass };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}

/** Verify the entered code against Twilio Verify (server decides pass/fail). */
export async function verifyOtp(phone: string, code: string): Promise<AuthResult> {
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code." };
  }
  try {
    const res = await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: toE164(phone), code }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (res.ok && data.ok) return { ok: true };
    return { ok: false, error: data.error ?? "Invalid code. Please try again." };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}
