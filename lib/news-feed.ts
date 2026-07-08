// Real-time health news aggregator — pulls live RSS from WHO and Singapore
// health sources at request time and normalises them into LatestUpdate[]. Runs
// server-side only (RSS hosts have no CORS headers): call it from the dashboard
// Server Component and the /api/news route, never from the browser.
//
// Upstream fetches are cached via Next's Data Cache (revalidate below), so the
// feed stays fresh without hammering the sources on every request.

import type { LatestUpdate } from "@/types";

const REVALIDATE_SECONDS = 300; // refresh live news at most every 5 minutes

interface Source {
  /** Fixed label when the feed is single-publisher (e.g. WHO, CNA). Google News
   *  carries the real publisher per <item>, so leave null there. */
  sourceName: string | null;
  url: string;
  /** Region hint surfaced as `location`. */
  location: string | null;
  /** Keep only items whose title/summary match (for broad section feeds). */
  filter?: RegExp;
}

// Health relevance filter for broad publisher section feeds (e.g. CNA Singapore).
const HEALTH_RE =
  /health|hospital|dengue|covid|virus|disease|medical|\bMOH\b|clinic|patient|vaccin|influenza|\bflu\b|outbreak|mental|cancer|elderly|nursing|caregiv|illness|infection|wellness|healthcare|ministry of health/i;

// WHO's official news feed (direct links → real cover images via og:image) +
// CNA Singapore (native MediaCorp images, health-filtered) + a Singapore health
// query via Google News for broad coverage (MOH / Straits Times / AsiaOne …).
const SOURCES: Source[] = [
  {
    sourceName: "World Health Organization",
    url: "https://www.who.int/rss-feeds/news-english.xml",
    location: "Global",
  },
  {
    sourceName: "CNA",
    url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=10416",
    location: "Singapore",
    filter: HEALTH_RE,
  },
  {
    // Broad Singapore health coverage (MOH / Straits Times / AsiaOne …). Google
    // News hides the publisher's image, so these fall back to a themed thumbnail.
    sourceName: null,
    url:
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent(
        'Singapore (dengue OR COVID OR influenza OR outbreak OR MOH OR hospital OR vaccination OR "public health" OR disease OR virus) when:14d',
      ) +
      "&hl=en-SG&gl=SG&ceid=SG:en",
    location: "Singapore",
  },
];

// ── Tiny XML helpers (zero-dependency; RSS 2.0 + Atom) ───────────────────────

const stripCdata = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
const stripTags = (s: string) => s.replace(/<[^>]+>/g, " ");
const decodeEntities = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#0?38;|&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
const clean = (s: string) => decodeEntities(stripCdata(s)).replace(/\s+/g, " ").trim();

/** Inner text of the first <tag>…</tag> in `block`. */
function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? clean(m[1]) : "";
}

/** Value of an attribute on the first matching self-closing/opening tag. */
function attr(block: string, name: string, a: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*\\b${a}="([^"]*)"`, "i"));
  return m ? decodeEntities(m[1]) : "";
}

// Stable short id from a URL/string (djb2 → base36), for React keys + ?post=.
function shortId(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return `n_${(h >>> 0).toString(36)}`;
}

function toIso(dateStr: string): string | null {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

// Split a feed body into raw <item>…</item> (RSS) or <entry>…</entry> (Atom).
function splitEntries(xml: string): { blocks: string[]; atom: boolean } {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi);
  if (items?.length) return { blocks: items, atom: false };
  const entries = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi);
  return { blocks: entries ?? [], atom: true };
}

function parseFeed(xml: string, src: Source): LatestUpdate[] {
  const { blocks, atom } = splitEntries(xml);
  const out: LatestUpdate[] = [];

  for (const block of blocks) {
    let title = tag(block, "title");
    if (!title) continue;

    // Google News packs "Headline - Publisher" and a per-item <source>.
    const perSource = tag(block, "source");
    const sourceName = src.sourceName ?? perSource ?? "Google News";
    if (perSource && title.endsWith(` - ${perSource}`)) {
      title = title.slice(0, -(perSource.length + 3)).trim();
    }

    const link = atom ? attr(block, "link", "href") : tag(block, "link");
    // Google News <description> is just the headline + publisher repeated (no
    // real synopsis), so drop it there; single-publisher feeds (WHO) carry a
    // genuine summary worth showing.
    const isAggregator = src.sourceName === null;
    const rawSummary = isAggregator
      ? ""
      : tag(block, atom ? "summary" : "description") || tag(block, "content");
    const summary = stripTags(clean(rawSummary)).replace(/\s+/g, " ").trim() || null;
    const publishedAt = toIso(
      tag(block, "pubDate") || tag(block, "published") || tag(block, "updated"),
    );
    const imageUrl =
      attr(block, "media:content", "url") ||
      attr(block, "media:thumbnail", "url") ||
      attr(block, "enclosure", "url") ||
      null;
    const category = tag(block, "category") || null;

    out.push({
      id: shortId(link || title),
      title,
      summary: summary && summary.length > 240 ? `${summary.slice(0, 237)}…` : summary,
      sourceName,
      sourceUrl: link || null,
      category,
      location: src.location,
      severity: null, // no LIVE badge on aggregated news items
      imageUrl,
      publishedAt,
    });
  }
  return out;
}

async function fetchSource(src: Source): Promise<LatestUpdate[]> {
  try {
    const res = await fetch(src.url, {
      headers: { "User-Agent": "Mozilla/5.0 (AidPulseSG News Aggregator)" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.warn(`[news] ${src.url} → HTTP ${res.status}`);
      return [];
    }
    const items = parseFeed(await res.text(), src);
    return src.filter ? items.filter((u) => src.filter!.test(`${u.title} ${u.summary ?? ""}`)) : items;
  } catch (err) {
    console.warn(`[news] ${src.url} failed:`, err);
    return [];
  }
}

// Google News wraps articles in a redirect that hides the publisher's og:image,
// so there's no point fetching those — everything else gets a real cover image.
const NO_OG_HOST = /(?:^|\.)google\.com$/i;

/** Fetch an article page and read its og:image / twitter:image cover, or null. */
async function resolveOgImage(pageUrl: string | null): Promise<string | null> {
  if (!pageUrl) return null;
  try {
    if (NO_OG_HOST.test(new URL(pageUrl).hostname)) return null;
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (AidPulseSG News Aggregator)" },
      next: { revalidate: 21600 }, // article covers rarely change — cache 6h
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m =
      html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    return m ? decodeEntities(m[1]) : null;
  } catch {
    return null; // timeout / network / bad html — fall back to the themed image
  }
}

const byNewest = (a: LatestUpdate, b: LatestUpdate) =>
  (b.publishedAt ? Date.parse(b.publishedAt) : 0) - (a.publishedAt ? Date.parse(a.publishedAt) : 0);

/**
 * Live health news from WHO + Singapore sources, sorted strictly newest first
 * and deduped by title. Returns [] if every source is unreachable (callers fall
 * back to the Supabase feed / mock).
 */
export async function fetchLiveNews(limit = 30): Promise<LatestUpdate[]> {
  const results = await Promise.allSettled(SOURCES.map(fetchSource));
  const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  const seen = new Set<string>();
  const out = all
    .filter((u) => {
      const key = u.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(byNewest) // newest first, across all sources
    .slice(0, limit);

  // Enrich items that have no image yet with their article's og:image cover, so
  // the feed shows real photos like before (WHO + direct-publisher links).
  await Promise.all(
    out.map(async (u) => {
      if (!u.imageUrl) u.imageUrl = await resolveOgImage(u.sourceUrl);
    }),
  );

  return out;
}
