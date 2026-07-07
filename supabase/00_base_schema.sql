-- ============================================================================
-- AidPulse SG — BASE SCHEMA (reconstructed)
-- ----------------------------------------------------------------------------
-- The repo's migrations and seed.sql assume a "base schema + original seed"
-- that was NOT included in the project files. This file recreates it so the
-- live dashboard works. It was reconstructed from:
--   - lib/data.ts   (every table/view/column the app reads)
--   - supabase/seed.sql (column names, the report_type enum values)
--   - supabase/migrations/* (the policies/views layered on top)
--
-- RUN ORDER (in the Supabase SQL editor):
--   1. THIS FILE  (00_base_schema.sql)   <- creates tables, enum, view, base data
--   2. migrations/20260610120000_citizen_live_access.sql
--   3. migrations/20260610130000_latest_updates.sql
--   4. migrations/20260610140000_case_stats_delta.sql
--   5. supabase/seed.sql                  <- tops up extra hospitals/clusters
--
-- Idempotent where practical: safe to re-run the DDL. The base seed at the
-- bottom is guarded so re-running won't duplicate rows.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Enum used by reports ────────────────────────────────────────────────────
-- Values match DB_REPORT_TYPE in lib/data.ts: symptoms | exposure |
-- positive_test | crowded_area | others
do $$
begin
  if not exists (select 1 from pg_type where typname = 'report_type') then
    create type public.report_type as enum
      ('symptoms', 'exposure', 'positive_test', 'crowded_area', 'others');
  end if;
end$$;

-- ── Hospitals + beds ────────────────────────────────────────────────────────
create table if not exists public.hospitals (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  address    text,
  latitude   double precision,
  longitude  double precision,
  is_active  boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.hospital_beds (
  id             uuid primary key default gen_random_uuid(),
  hospital_id    uuid not null references public.hospitals(id) on delete cascade,
  bed_type       text not null,
  total_beds     integer not null default 0,
  available_beds integer not null default 0,
  occupied_beds  integer not null default 0,
  reserved_beds  integer not null default 0
);

-- ── Case clusters (dengue/flu/etc.) — read by map, banner, area ranking ─────
-- source_id + unique index support the n8n case-clusters ingest
-- (upsert on_conflict=source_id).
create table if not exists public.case_clusters (
  id             uuid primary key default gen_random_uuid(),
  source_id      text unique,
  disease        text,
  title          text,
  description    text,
  area_name      text,
  latitude       double precision,
  longitude      double precision,
  active_cases   integer default 0,
  critical_cases integer default 0,
  risk_level     text,
  is_banner      boolean default false,
  created_at     timestamptz default now()
);

-- ── News updates (legacy feed; also fed by news-updates-ingest) ─────────────
create table if not exists public.news_updates (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  summary      text,
  image_url    text,
  source_url   text unique,
  category     text,
  is_live      boolean default false,
  status       text default 'published',
  published_at timestamptz,
  created_at   timestamptz default now()
);

-- ── Citizen reports + photos ────────────────────────────────────────────────
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  report_type   public.report_type not null,
  location_text text,
  latitude      double precision,
  longitude     double precision,
  details       text,
  contact_info  text,
  status        text default 'new',
  created_at    timestamptz default now()
);

create table if not exists public.report_photos (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references public.reports(id) on delete cascade,
  file_url   text not null,
  created_at timestamptz default now()
);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Migration 1 adds the anon SELECT policies; RLS just needs to be ON here.
alter table public.hospitals     enable row level security;
alter table public.hospital_beds enable row level security;
alter table public.case_clusters enable row level security;
alter table public.news_updates  enable row level security;
alter table public.reports       enable row level security;
alter table public.report_photos enable row level security;

-- ── v_area_ranking VIEW — "Areas by Active Cases" ───────────────────────────
-- App reads: area_name, active_cases, critical_cases, ranking (ordered by rank).
create or replace view public.v_area_ranking as
select
  area_name,
  sum(active_cases)::bigint   as active_cases,
  sum(critical_cases)::bigint as critical_cases,
  row_number() over (order by sum(active_cases) desc)::int as ranking
from public.case_clusters
where area_name is not null
group by area_name;

grant select on public.v_area_ranking to anon, authenticated;

-- ============================================================================
-- BASE SEED — the "original AidPulse seed" the repo's seed.sql builds on:
-- St. Mary's Hospital, Central General Hospital, and 5 core clusters, plus a
-- few news rows so the dashboard has content without n8n running.
-- Guarded so re-running does not duplicate.
-- ============================================================================

insert into public.hospitals (name, address, latitude, longitude, is_active)
select v.name, v.address, v.lat, v.lng, true
from (values
  ('St. Mary''s Hospital',      '5 Second Hospital Ave, Singapore', 1.2789, 103.8536),
  ('Central General Hospital',  '1 Hospital Cres, Singapore',       1.3010, 103.8390)
) as v(name, address, lat, lng)
where not exists (select 1 from public.hospitals h where h.name = v.name);

-- One base bed row for St. Mary's (seed.sql adds ICU/ED/Maternity but no
-- General Ward for it; Central General's beds come entirely from seed.sql).
insert into public.hospital_beds (hospital_id, bed_type, total_beds, available_beds, occupied_beds, reserved_beds)
select h.id, 'General Ward', 180, 52, 120, 8
from public.hospitals h
where h.name = 'St. Mary''s Hospital'
  and not exists (
    select 1 from public.hospital_beds b
    where b.hospital_id = h.id and b.bed_type = 'General Ward'
  );

-- 5 core clusters (Bedok + Jurong East are added later by seed.sql).
insert into public.case_clusters
  (source_id, disease, title, description, area_name, latitude, longitude, active_cases, critical_cases, risk_level, is_banner)
select v.source_id, v.disease, v.title, v.description, v.area_name, v.lat, v.lng, v.active, v.critical, v.risk, v.banner
from (values
  ('core-tampines',  'dengue',    'Dengue cluster in Tampines',        'Active dengue transmission around Tampines Ave.',      'Tampines',   1.3496, 103.9568, 132, 3, 'critical', true),
  ('core-woodlands', 'covid',     'COVID-19 uptick in Woodlands',      'Rising COVID-19 cases near Woodlands MRT.',            'Woodlands',  1.4380, 103.7890,  74, 2, 'high',     false),
  ('core-amk',       'dengue',    'Dengue watch in Ang Mo Kio',        'Cluster monitored around Ang Mo Kio Ave 3.',           'Ang Mo Kio', 1.3691, 103.8454,  46, 1, 'high',     false),
  ('core-clementi',  'influenza', 'Influenza cases in Clementi',       'Seasonal flu activity around Clementi.',               'Clementi',   1.3151, 103.7650,  38, 0, 'medium',   false),
  ('core-toapayoh',  'covid',     'COVID-19 cluster in Toa Payoh',     'Small COVID-19 cluster near Toa Payoh Central.',       'Toa Payoh',  1.3343, 103.8563,  29, 0, 'medium',   false)
) as v(source_id, disease, title, description, area_name, lat, lng, active, critical, risk, banner)
where not exists (select 1 from public.case_clusters c where c.source_id = v.source_id);

-- A few news rows so the "Latest Updates" legacy feed isn't empty pre-n8n.
insert into public.news_updates (title, summary, image_url, source_url, category, is_live, status, published_at)
select v.title, v.summary, null, v.url, 'Public Health', v.live, 'published', now() - (v.age || ' hours')::interval
from (values
  ('NEA steps up dengue inspections island-wide', 'Vector-control teams intensify checks as clusters grow.', 'seed://news/dengue-1',  false, '2'),
  ('MOH monitors COVID-19 activity in the north',  'Health authorities track a localised rise in cases.',     'seed://news/covid-1',   true,  '5'),
  ('Hospitals report stable bed availability',     'Emergency departments operating within normal capacity.', 'seed://news/beds-1',    false, '9')
) as v(title, summary, url, live, age)
where not exists (select 1 from public.news_updates n where n.source_url = v.url);
