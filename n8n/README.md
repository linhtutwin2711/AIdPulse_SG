# n8n — news / updates ingest

> **Canonical workflow:** `latest-updates-ingest.json` → the **`latest_updates`**
> table, which the citizen dashboard's **Latest Updates** section reads
> (`lib/data.ts#getLatestUpdates`, server-rendered, newest 5). The older
> `news-updates-ingest.json` (→ `news_updates`) is kept for reference but is
> superseded by this one for the dashboard feed.

## latest-updates-ingest.json (current)

**Schedule:** every 15 minutes. **Source:** Google News RSS, queried for
Singapore public-health topics (dengue / COVID / flu / vaccine / outbreak /
hospital / MOH / NEA / public health). **Flow:** fetch → normalize + **health
keyword filter** → de-dupe by `source_url` → upsert into `latest_updates`
(`on_conflict=source_url`, `Prefer: resolution=merge-duplicates`). The UNIQUE
constraint on `source_url` is the final dedupe guard, so re-runs never duplicate.

Why Google News: government agencies (MOH/NEA) don't publish reliable RSS, and
general outlets (e.g. CNA) rarely have Singapore-health items on a given day. The
Google News query aggregates real health articles from many outlets. These feeds
carry **no image**, so `image_url` is left null and the app renders a themed
local image (`public/images/news/health-*.svg`) keyed off the headline — the
article's own image is used instead whenever a feed does provide one.

### Setup
1. Supabase → **Settings → API → `service_role` key**. Replace both
   `<SUPABASE_SERVICE_ROLE_KEY>` placeholders. service_role is required (RLS
   only grants anon **read**; writes bypass RLS). Keep it in n8n only — never in
   the browser app. Prefer an n8n **Credential** over an inline value.
2. (Optional) tweak the query keywords in the *Google News (SG health)* node
   URL, or add another RSS source — the *Normalize + health filter* node already
   keeps only health items, so off-topic feeds are safe to add.
3. Import `latest-updates-ingest.json`, run once, confirm rows land in
   `latest_updates`, then **Activate**.

### Row mapping (RSS → latest_updates)
| latest_updates | RSS field |
|---|---|
| `title` | `title` with the trailing " - Publisher" stripped |
| `source_name` | the stripped publisher (or `creator`) |
| `source_url` (UNIQUE) | `link` |
| `image_url` | feed image if present, else null → themed local fallback |
| `category` | `Health` |
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
