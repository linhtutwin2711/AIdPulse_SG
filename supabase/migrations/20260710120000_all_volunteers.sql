-- List all registered volunteers for the Emergency Officer dashboard
-- ---------------------------------------------------------------------------
-- volunteer_profiles is written at registration (upsert_volunteer_profile) but
-- there was no way to read the whole roster — so a real registered volunteer
-- never appeared in the officer's Volunteers page. This adds a SECURITY DEFINER
-- RPC that returns only the non-sensitive fields an officer needs (name +
-- skills + join date). Address / DOB / phone are deliberately NOT exposed.
--
-- Idempotent: safe to re-run.

create or replace function public.get_all_volunteers()
returns table (full_name text, skills text[], joined_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select full_name, coalesce(skills, '{}'), created_at
  from public.volunteer_profiles
  where full_name is not null and length(trim(full_name)) > 0
  order by created_at desc;
$$;

revoke all on function public.get_all_volunteers() from public;
grant execute on function public.get_all_volunteers() to anon, authenticated;
