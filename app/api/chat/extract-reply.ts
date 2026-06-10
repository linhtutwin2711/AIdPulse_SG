/**
 * Pulls the assistant's text out of whatever shape n8n's "Respond to Webhook"
 * node returns. The workflow may answer with a raw string, an array, or an
 * object keyed by any of several names — so we check each in turn and fall back
 * to null (letting the caller show a friendly error) when nothing matches.
 *
 * Kept in its own module (no `next/server` import) so it can be unit-tested with
 * the zero-dependency `node --test` runner.
 */
export function extractReply(data: unknown): string | null {
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return extractReply(data[0]);
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["reply", "output", "text", "message", "answer", "response"]) {
      const v = obj[key];
      if (typeof v === "string" && v.trim()) return v;
    }
  }
  return null;
}
