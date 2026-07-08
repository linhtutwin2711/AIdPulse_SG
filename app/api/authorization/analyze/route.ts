import { NextResponse } from "next/server";

/**
 * Officer-authorization analysis proxy: the browser POSTs the uploaded
 * appointment/authorization letter here and we forward it to an n8n workflow
 * (webhook → Gemini vision → structured JSON) — same pattern as
 * /api/certificate/analyze.
 *
 * Expected n8n response shape:
 *   { authorized: boolean, documentType: string, holder: string,
 *     issuer: string, approvedBy: string, hospitalName: string,
 *     confidence: number }
 *
 * Until N8N_AUTH_WEBHOOK_URL is set this returns 503 and the client falls
 * back to its on-device analyser, so the flow always works.
 */

const WEBHOOK_URL = process.env.N8N_AUTH_WEBHOOK_URL;

export async function POST(req: Request) {
  if (!WEBHOOK_URL) {
    return NextResponse.json(
      { error: "Authorization AI is not configured. Set N8N_AUTH_WEBHOOK_URL in .env.local." },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing document file." }, { status: 400 });
  }
  // Server-side upload limits — never trust the client-side accept attribute.
  const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Upload a PDF or image document." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Document too large (max 10 MB)." }, { status: 400 });
  }

  // Metadata only — never log document contents (it's a confidential letter).
  console.log("[api/authorization] analysing:", { name: file.name, size: file.size });

  // Gemini vision can be slow, but never hang the client past 30s — a timeout
  // returns 502 and the browser falls back to on-device analysis.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 30_000);
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        data: buf.toString("base64"),
        hints: String(form.get("hints") ?? ""),
      }),
      cache: "no-store",
      signal: abort.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("n8n authorization webhook error", res.status, detail);
      return NextResponse.json({ error: "Analysis failed upstream." }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({
      authorized: Boolean(data.authorized),
      documentType: String(data.documentType ?? "Document"),
      holder: String(data.holder ?? ""),
      issuer: String(data.issuer ?? ""),
      approvedBy: String(data.approvedBy ?? ""),
      hospitalName: String(data.hospitalName ?? ""),
      confidence: Number(data.confidence ?? 0.5),
    });
  } catch (err) {
    console.error("authorization analyze error", err);
    return NextResponse.json({ error: "Network error reaching the AI workflow." }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
