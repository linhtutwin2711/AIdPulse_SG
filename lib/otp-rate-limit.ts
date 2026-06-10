// SERVER-ONLY. A tiny in-memory throttle for OTP *sends* — protects against
// SMS-pumping fraud (someone hammering "resend" to burn your SMS balance).
//
// NOTE: in-memory state resets on server restart and is per-instance. That is
// fine for a single-node demo, but a production deployment on serverless /
// multi-region should back this with a shared store (Redis, or a Supabase
// table) so the limits actually hold across instances. Twilio Verify already
// enforces its own per-code attempt cap and expiry, so we only gate sends here.

type Bucket = { count: number; windowStart: number; lastSent: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000; // rolling 1-hour window
const MAX_PER_WINDOW = 5; // at most 5 codes per key per hour
const MIN_GAP_MS = 30 * 1000; // at least 30s between sends

type Gate = { ok: true } | { ok: false; reason: string };

export function canSend(key: string): Gate {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now - b.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now, lastSent: now });
    return { ok: true };
  }

  if (now - b.lastSent < MIN_GAP_MS) {
    const wait = Math.ceil((MIN_GAP_MS - (now - b.lastSent)) / 1000);
    return { ok: false, reason: `Please wait ${wait}s before requesting another code.` };
  }

  if (b.count >= MAX_PER_WINDOW) {
    return { ok: false, reason: "Too many codes requested. Please try again later." };
  }

  b.count += 1;
  b.lastSent = now;
  return { ok: true };
}
