-- Real-time "Latest Updates" feed, populated by the n8n ingest workflow.
-- ---------------------------------------------------------------------------
-- Read by the citizen dashboard (lib/data.ts#getLatestUpdates) as the anon
-- role, so RLS gets an anon SELECT policy. Writes come from n8n using the
-- service_role key, which bypasses RLS — no anon insert policy is granted.
-- Idempotent: safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.latest_updates (
  update_id    uuid primary key default gen_random_uuid(),
  title        text not null,
  summary      text,
  content      text,
  source_name  text,
  source_url   text unique,
  category     text,
  location     text,
  severity     text,
  image_url    text,
  published_at timestamptz,
  created_at   timestamptz default now()
);

-- Supports the "order by published_at desc limit 5" read path.
create index if not exists latest_updates_published_at_idx
  on public.latest_updates (published_at desc nulls last);

alter table public.latest_updates enable row level security;

-- Public read (citizen dashboard, anon key). Writes are service_role only.
drop policy if exists latest_updates_public_read on public.latest_updates;
create policy latest_updates_public_read on public.latest_updates
  for select to anon using (true);
