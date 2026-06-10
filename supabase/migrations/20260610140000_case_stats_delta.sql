-- Day-over-day delta for the "Real-time Case Tracking" cards.
-- ---------------------------------------------------------------------------
-- v_case_tracking previously summed case_clusters with no history, so the
-- "vs yesterday" delta was always 0. This adds a daily snapshot table (written
-- by the n8n case-clusters ingest) and rewrites the view to compute the delta
-- between today's live totals and the most recent prior-day snapshot.
-- Idempotent.

create table if not exists public.case_stats_snapshots (
  snapshot_date  date primary key,
  active_cases   integer not null default 0,
  critical_cases integer not null default 0,
  updated_at     timestamptz default now()
);

alter table public.case_stats_snapshots enable row level security;
drop policy if exists snapshots_public_read on public.case_stats_snapshots;
create policy snapshots_public_read on public.case_stats_snapshots
  for select to anon using (true);

-- Live totals from case_clusters + delta vs the latest earlier-day snapshot.
-- Column types kept as bigint to match the previous view definition.
create or replace view public.v_case_tracking as
with today as (
  select coalesce(sum(active_cases), 0::bigint)   as active_cases,
         coalesce(sum(critical_cases), 0::bigint) as critical_cases
  from public.case_clusters
),
prev as (
  select active_cases, critical_cases
  from public.case_stats_snapshots
  where snapshot_date < current_date
  order by snapshot_date desc
  limit 1
)
select t.active_cases,
       t.critical_cases,
       (t.active_cases   - coalesce(p.active_cases,   t.active_cases))::bigint   as active_delta,
       (t.critical_cases - coalesce(p.critical_cases, t.critical_cases))::bigint as critical_delta
from today t
left join prev p on true;
