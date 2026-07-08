import { NextResponse } from "next/server";
import { fetchLiveNews } from "@/lib/news-feed";

// Real-time health-news feed for the browser. The /updates client page can't
// fetch cross-origin RSS directly (no CORS on the sources), so it calls this
// same-origin route, which aggregates WHO + Singapore health news server-side.
// Upstream RSS is cached by lib/news-feed (revalidate), so this stays cheap.

export async function GET(req: Request) {
  const limitParam = Number(new URL(req.url).searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 30;

  try {
    const updates = await fetchLiveNews(limit);
    return NextResponse.json({ updates });
  } catch (err) {
    console.error("[api/news] failed:", err);
    return NextResponse.json({ updates: [] }, { status: 502 });
  }
}
