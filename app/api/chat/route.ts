import { NextResponse } from "next/server";
import { extractReply } from "./extract-reply";

/**
 * Chat proxy: the browser POSTs here, and we forward the message to the
 * n8n workflow's webhook (which runs Gemini Flash and returns a reply).
 *
 * Why proxy instead of calling n8n straight from the browser:
 *  - avoids CORS errors from the n8n domain
 *  - keeps the webhook URL out of the public client bundle
 *  - one place to handle errors / shape the response
 *
 * Set N8N_WEBHOOK_URL in .env.local to your n8n Webhook node's Production URL,
 * e.g. https://khantnyarsay.app.n8n.cloud/webhook/aidpulse-chat
 */

const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

export async function POST(req: Request) {
  if (!WEBHOOK_URL) {
    return NextResponse.json(
      { error: "Chat is not configured. Set N8N_WEBHOOK_URL in .env.local." },
      { status: 500 }
    );
  }

  let body: { message?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Empty message." }, { status: 400 });
  }

  console.log("[api/chat] incoming:", { message, sessionId: body.sessionId });

  try {
    console.log("[api/chat] forwarding to n8n webhook:", WEBHOOK_URL);
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId: body.sessionId ?? "anon" }),
      // n8n + Gemini can take a few seconds; don't cache.
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("n8n webhook error", res.status, detail);
      return NextResponse.json(
        { error: "The assistant is unavailable right now." },
        { status: 502 }
      );
    }

    // n8n may reply with JSON or plain text depending on the workflow.
    const raw = await res.text();
    console.log("[api/chat] n8n raw response:", raw);
    let reply: string | null = null;
    try {
      reply = extractReply(JSON.parse(raw));
    } catch {
      reply = raw.trim() || null;
    }
    console.log("[api/chat] extracted reply:", reply);

    return NextResponse.json({
      reply: reply ?? "Sorry, I couldn't generate a response.",
    });
  } catch (err) {
    console.error("Failed to reach n8n webhook", err);
    return NextResponse.json(
      { error: "The assistant is unavailable right now." },
      { status: 502 }
    );
  }
}
