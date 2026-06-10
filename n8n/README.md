# n8n — Latest News ingest

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
