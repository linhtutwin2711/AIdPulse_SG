// Phone-OTP auth seam (mock for now).
//
// TODO(supabase): replace the bodies with Supabase Phone Auth:
//   requestOtp -> supabase.auth.signInWithOtp({ phone })
//   verifyOtp  -> supabase.auth.verifyOtp({ phone, token: code, type: "sms" })
// Keep the signatures so the UI does not change when the backend lands.

export type AuthMode = "signup" | "login";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Send a one-time code to the phone number. */
export async function requestOtp(phone: string): Promise<{ ok: boolean }> {
  await wait(600);
  // `phone` includes the country dial code; lengths vary by country.
  return { ok: phone.replace(/\D/g, "").length >= 7 };
}

/** Verify the entered code. (Demo: any 6-digit code is accepted.) */
export async function verifyOtp(
  _phone: string,
  code: string,
): Promise<{ ok: boolean }> {
  await wait(600);
  return { ok: /^\d{6}$/.test(code) };
}
