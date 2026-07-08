import { NextResponse } from "next/server";
import { saveSubscription, type StoredSubscription } from "../store";

/** Devices POST their push subscription here after granting permission. */
export async function POST(req: Request) {
  let sub: StoredSubscription;
  try {
    sub = (await req.json()) as StoredSubscription;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "Not a push subscription." }, { status: 400 });
  }
  await saveSubscription(sub);
  // Metadata only — the endpoint hostname identifies the push service, not the user.
  console.log("[broadcast] device subscribed:", new URL(sub.endpoint).hostname);
  return NextResponse.json({ ok: true });
}
