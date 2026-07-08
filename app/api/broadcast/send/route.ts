import { NextResponse } from "next/server";
import webpush from "web-push";
import { allSubscriptions, removeSubscription } from "../store";

/**
 * The officer's Broadcast form POSTs here; every subscribed device (citizen,
 * volunteer, or officer — any role that granted notification permission) gets
 * a system push notification, lock screen included.
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:alerts@aidpulse.sg";

export async function POST(req: Request) {
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    return NextResponse.json(
      { error: "Push is not configured. Set the VAPID keys in .env.local." },
      { status: 503 }
    );
  }
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);

  let body: { area?: string; severity?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "Empty message." }, { status: 400 });

  const severity = (body.severity ?? "high").toUpperCase();
  const area = body.area ?? "Singapore";
  const payload = JSON.stringify({
    title: `🚨 ${severity} ALERT · ${area}`,
    body: message.slice(0, 300),
    url: "/dashboard",
    tag: "aidpulse-broadcast",
  });

  const subs = await allSubscriptions();
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(s, payload).catch((err) => {
        // 404/410 = the device unsubscribed / expired — drop it and move on.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          void removeSubscription(s.endpoint);
        }
        throw err;
      })
    )
  );
  const delivered = results.filter((r) => r.status === "fulfilled").length;
  console.log(`[broadcast] "${severity} · ${area}" → ${delivered}/${subs.length} devices`);
  return NextResponse.json({ ok: true, delivered, devices: subs.length });
}
