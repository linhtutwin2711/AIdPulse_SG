-- Persist the latest officer broadcast so it is visible across Vercel instances
-- ---------------------------------------------------------------------------
-- The in-app broadcast alert was previously kept in process memory (globalThis).
-- That works in a single dev process, but on Vercel each serverless instance has
-- its own memory: an officer's broadcast saved on instance A is invisible to a
-- citizen whose /api/broadcast/latest poll lands on instance B. Storing each
-- broadcast here — read back as "most recent by ts" — makes it reliable for
-- every open app tab, matching how push_subscriptions is already persisted.
--
-- Same anon model as the rest of the app (no server-side auth): the browser is
-- anonymous, so anon may read and insert. Idempotent: safe to re-run.

create table if not exists public.broadcasts (
  id         text primary key,        -- unique per send, e.g. "1783956944285-285"
  severity   text not null,           -- LOW | MEDIUM | HIGH | CRITICAL
  area       text not null,           -- affected area label
  message    text not null,           -- alert body (already trimmed to 300 chars)
  ts         bigint not null,         -- Date.now() at send time; ordering key
  created_at timestamptz default now()
);

-- Fast "latest broadcast" lookup.
create index if not exists broadcasts_ts_idx on public.broadcasts (ts desc);

alter table public.broadcasts enable row level security;

-- Anon (the app's client role) may read the latest broadcast and insert new
-- ones. Drop-then-create so re-running this file doesn't error on the policy.
drop policy if exists "anon manage broadcasts" on public.broadcasts;
create policy "anon manage broadcasts" on public.broadcasts
  for all to anon using (true) with check (true);
