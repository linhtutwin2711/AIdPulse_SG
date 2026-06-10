# n8n — news / updates ingest

> **Canonical workflow:** `latest-updates-ingest.json` → the **`latest_updates`**
> table, which the citizen dashboard's **Latest Updates** section reads
> (`lib/data.ts#getLatestUpdates`, server-rendered, newest 5). The older
> `news-updates-ingest.json` (→ `news_updates`) is kept for reference but is
> superseded by this one for the dashboard feed.

## latest-updates-ingest.json (current)

**Schedule:** every 15 minutes. **Sources:** trusted public-health / pandemic
authorities via RSS — **WHO** (who.int) and **UN News – Health** (news.un.org).
**Flow:** read feeds → for each article fetch its page and read **`og:image`**
(the real article photo) → de-dupe by `source_url` → upsert into `latest_updates`
(`on_conflict=source_url`, `Prefer: resolution=merge-duplicates`). The UNIQUE
constraint on `source_url` is the final dedupe guard, so re-runs never duplicate.

Why these sources: government agencies (MOH/NEA) don't publish reliable RSS,
general outlets rarely have health items on a given day, and Google News hides
the real article URL. WHO/UN feeds give **real pandemic articles with real photos
and working links** to popular, trusted sites. The *Normalize + og:image* node
fetches each article's `og:image`, so the app shows the genuine news photo; only
items with a real photo are kept (a themed local SVG is the last-resort fallback
in the app for any row that still lacks an image).

Add more sources by appending feed URLs in the *Health sources* node — CNA and
The Straits Times (direct-URL feeds) also work; `source_name` is derived from the
article domain.

### Setup
1. Supabase → **Settings → API → `service_role` key**. Replace both
   `<SUPABASE_SERVICE_ROLE_KEY>` placeholders. service_role is required (RLS
   only grants anon **read**; writes bypass RLS). Keep it in n8n only — never in
   the browser app. Prefer an n8n **Credential** over an inline value.
2. Import `latest-updates-ingest.json`, run once, confirm rows land in
   `latest_updates`, then **Activate**.

### Row mapping (RSS → latest_updates)
| latest_updates | source |
|---|---|
| `title` | feed `title` |
| `summary` | feed `contentSnippet` / `summary` (HTML stripped) |
| `source_name` | derived from the article domain (WHO / UN News / …) |
| `source_url` (UNIQUE) | article `link` |
| `image_url` | the article's `og:image` (real photo) |
| `category` | `Public Health` |
| `published_at` | `isoDate` / `pubDate` |

---

# (legacy) Latest News ingest → news_updates

Pulls real public-health news into the `news_updates` table on a schedule. The
citizen dashboard's **Latest Updates** feed reads that table
(`lib/data.ts#fetchNewsUpdates`, `status = 'published'`), so no app change is
needed — new rows just appear.

## How it works

`news-updates-ingest.json` is an importable n8n workflow with 4 nodes:

1. **Every hour** — Schedule trigger (adjust the interval as you like).
2. **NewsData.io (SG health)** — `GET https://newsdata.io/api/1/news` with
   `country=sg&category=health&language=en`.
3. **Map -> news_updates rows** — Code node mapping each article to a row:
   `title, summary, image_url, source_url, category, published_at`.
4. **Upsert to Supabase** — `POST /rest/v1/news_updates?on_conflict=source_url`
   with `Prefer: resolution=merge-duplicates`. The UNIQUE constraint on
   `source_url` means re-runs never create duplicates.

## Setup

1. Get a free API key at https://newsdata.io (or swap in GNews / NewsAPI — see
   below). Replace `<NEWSDATA_API_KEY>` in the workflow.
2. In Supabase: **Project Settings → API → `service_role` key**. Replace both
   `<SUPABASE_SERVICE_ROLE_KEY>` placeholders.
   - The **service_role** key is required because RLS only allows officer
     inserts; service_role bypasses RLS. It is a server-side secret — keep it in
     n8n only, never in the browser app. Prefer an n8n **Credential** over an
     inline value.
3. Import `news-updates-ingest.json` into n8n (Workflows → Import from File).
4. Run once manually to verify rows land in `news_updates`, then **Activate**.

## Field mapping

| news_updates | NewsData.io field |
|---|---|
| `title` | `title` |
| `summary` | `description` |
| `image_url` | `image_url` |
| `source_url` (UNIQUE) | `link` |
| `category` | `category[0]` |
| `published_at` | `pubDate` (→ ISO) |
| `status` | `'published'` (constant) |

## Alternative sources (no/other key)

- **GNews** — `https://gnews.io/api/v4/top-headlines?topic=health&country=sg&token=KEY`
  (map `url`→source_url, `image`→image_url, `publishedAt`→published_at).
- **RSS, no key** — use n8n's **RSS Read** node on a feed like CNA Health; map
  `link`→source_url, `isoDate`→published_at. Drop the NewsData HTTP node and
  point the Code node at the RSS items.
