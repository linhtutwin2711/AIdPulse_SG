// SERVER-ONLY. Stateless email-OTP token helpers.
//
// The 6-digit code is never stored and never sent to the browser. Instead the
// /send route hands the client an HMAC-signed token that binds
// (email, sha256(code), expiry). The /verify route recomputes the HMAC from the
// same inputs and constant-time compares — a match proves the code the user
// typed is the one we emailed, with no database. Supabase can replace this later
// with zero UI changes.
//
// Requires EMAIL_OTP_SECRET (any long random string, 16+ chars). Keep it
// server-side only — never expose it with a NEXT_PUBLIC_ prefix.

import { createHash, createHmac, randomInt, timingSafeEqual } from "crypto";

const TTL_MS = 10 * 60 * 1000; // codes expire 10 minutes after they're issued

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// True only when the secret is present and long enough to be worth signing with.
export const isEmailOtpConfigured = () =>
  Boolean(process.env.EMAIL_OTP_SECRET && process.env.EMAIL_OTP_SECRET.length >= 16);

function secret(): string {
  const s = process.env.EMAIL_OTP_SECRET;
  if (!s || s.length < 16) {
    throw new Error("EMAIL_OTP_SECRET is missing or too short (need 16+ chars).");
  }
  return s;
}

function sign(email: string, codeHash: string, expiresAtMs: number): string {
  const payload = `${email}|${codeHash}|${expiresAtMs}`;
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Random 6-digit numeric code (leading zeros allowed), from a CSPRNG. */
export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Called by /send once the code has been emailed. Returns an opaque token —
 * base64url of "<expiry>.<signature>" — that carries only the expiry and the
 * HMAC. The code itself is not recoverable from it.
 */
export function makeToken(email: string, code: string): string {
  const exp = Date.now() + TTL_MS;
  const sig = sign(email, sha256(code), exp);
  return Buffer.from(`${exp}.${sig}`).toString("base64url");
}

type VerifyResult = { ok: true } | { ok: false; reason: string };

/**
 * Called by /verify. Rebuilds the signature from (email, sha256 of the code the
 * user typed, expiry decoded from the token) and constant-time compares.
 */
export function verifyToken(email: string, code: string, token: string): VerifyResult {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return { ok: false, reason: "Malformed token." };
  }

  const dot = decoded.indexOf(".");
  if (dot < 0) return { ok: false, reason: "Malformed token." };

  const exp = Number(decoded.slice(0, dot));
  const sig = decoded.slice(dot + 1);
  if (!Number.isFinite(exp)) return { ok: false, reason: "Malformed token." };
  if (Date.now() > exp) return { ok: false, reason: "Code expired. Request a new one." };

  const expected = sign(email, sha256(code), exp);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch — guard so a bad token can't 500.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "Incorrect code." };
  }
  return { ok: true };
}
