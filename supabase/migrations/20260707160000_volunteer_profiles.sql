-- Persist volunteer registration + certificate-AI skills
-- ---------------------------------------------------------------------------
-- Identity is the user's phone number (E.164), the same "no real auth" model as
-- submit_report: the browser is anon, so writes go through SECURITY DEFINER
-- RPCs rather than direct table grants. One row per phone.
--
-- Idempotent: safe to re-run.

create table if not exists public.volunteer_profiles (
  phone          text primary key,            -- E.164 identity key, e.g. +6591234567
  full_name      text,
  date_of_birth  date,
  gender         text,
  address        text,
  skills         text[] default '{}',
  certifications jsonb  default '[]',          -- [{file, certification, skills, confidence, source}]
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table public.volunteer_profiles enable row level security;
-- No direct anon policies — all access is via the SECURITY DEFINER RPCs below,
-- so one phone can't enumerate another's row through PostgREST.

-- Upsert the whole volunteer profile for a phone. Called on registration and
-- whenever skills change (certificate upload).
create or replace function public.upsert_volunteer_profile(
  p_phone          text,
  p_full_name      text default null,
  p_date_of_birth  date default null,
  p_gender         text default null,
  p_address        text default null,
  p_skills         text[] default '{}',
  p_certifications jsonb default '[]'
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_phone is null or length(trim(p_phone)) = 0 then
    raise exception 'phone is required';
  end if;

  insert into public.volunteer_profiles
    (phone, full_name, date_of_birth, gender, address, skills, certifications, updated_at)
  values
    (p_phone, p_full_name, p_date_of_birth, p_gender, p_address,
     coalesce(p_skills, '{}'), coalesce(p_certifications, '[]'), now())
  on conflict (phone) do update set
    full_name      = coalesce(excluded.full_name, public.volunteer_profiles.full_name),
    date_of_birth  = coalesce(excluded.date_of_birth, public.volunteer_profiles.date_of_birth),
    gender         = coalesce(excluded.gender, public.volunteer_profiles.gender),
    address        = coalesce(excluded.address, public.volunteer_profiles.address),
    skills         = excluded.skills,
    certifications = excluded.certifications,
    updated_at     = now();
end;
$$;

-- Read a single volunteer profile by phone (returns 0 or 1 row).
create or replace function public.get_volunteer_profile(p_phone text)
returns setof public.volunteer_profiles
language sql
security definer
set search_path = public
as $$
  select * from public.volunteer_profiles where phone = p_phone;
$$;

revoke all on function public.upsert_volunteer_profile(text, text, date, text, text, text[], jsonb) from public;
grant execute on function public.upsert_volunteer_profile(text, text, date, text, text, text[], jsonb) to anon, authenticated;
revoke all on function public.get_volunteer_profile(text) from public;
grant execute on function public.get_volunteer_profile(text) to anon, authenticated;
