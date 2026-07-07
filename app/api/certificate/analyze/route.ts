import { NextResponse } from "next/server";

/**
 * Certificate analysis proxy: the browser POSTs the uploaded certificate here,
 * and we forward it to an n8n workflow (webhook → Gemini vision → structured
 * JSON) — same pattern as /api/chat.
 *
 * Expected n8n response shape:
 *   { certification: string, skills: string[], confidence: number }
 *
 * Until N8N_CERT_WEBHOOK_URL is set in .env.local this returns 503 and the
 * client falls back to its on-device analyser, so the flow always works.
 */

const WEBHOOK_URL = process.env.N8N_CERT_WEBHOOK_URL;

export async function POST(req: Request) {
  if (!WEBHOOK_URL) {
    return NextResponse.json(
      { error: "Certificate AI is not configured. Set N8N_CERT_WEBHOOK_URL in .env.local." },
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
    return NextResponse.json({ error: "Missing certificate file." }, { status: 400 });
  }

  // Metadata only — never log file contents.
  console.log("[api/certificate] analysing:", { name: file.name, size: file.size });

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
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("n8n certificate webhook error", res.status, detail);
      return NextResponse.json({ error: "Analysis failed upstream." }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({
      certification: String(data.certification ?? "Certificate"),
      skills: Array.isArray(data.skills) ? data.skills.map(String) : [],
      confidence: Number(data.confidence ?? 0.5),
    });
  } catch (err) {
    console.error("certificate analyze error", err);
    return NextResponse.json({ error: "Network error reaching the AI workflow." }, { status: 502 });
  }
}
