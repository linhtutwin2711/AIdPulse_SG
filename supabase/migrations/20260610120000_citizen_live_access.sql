-- Citizen dashboard + Track Cases: live read/write access
-- ---------------------------------------------------------------------------
-- The app has no real Supabase auth session yet (lib/auth.ts is a mock OTP),
-- so the browser always talks to the API as the `anon` role. RLS is enabled on
-- every table and only `authenticated` policies existed, which silently blocked
-- the citizen-facing reads (banner, updates, map clusters, hospitals all came
-- back empty). This migration grants public read access to the public-health
-- tables and adds a safe, PII-protected path for citizen reports.
--
-- Idempotent: safe to re-run.

-- 1) Public (anon) read access for citizen-facing public-health tables.
--    The v_case_tracking / v_area_ranking views already bypass RLS as
--    SECURITY DEFINER; these unblock the base tables read directly by the UI.
drop policy if exists clusters_public_read on public.case_clusters;
create policy clusters_public_read on public.case_clusters
  for select to anon using (true);

drop policy if exists hospitals_public_read on public.hospitals;
create policy hospitals_public_read on public.hospitals
  for select to anon using (true);

drop policy if exists beds_public_read on public.hospital_beds;
create policy beds_public_read on public.hospital_beds
  for select to anon using (true);

drop policy if exists news_public_read on public.news_updates;
create policy news_public_read on public.news_updates
  for select to anon using (status = 'published');

-- 2) Public, non-PII view of citizen reports for the live map dots.
--    Excludes contact_info and reporter_id; hides closed reports.
create or replace view public.v_public_reports as
select id, report_type, location_text, latitude, longitude, details, status, created_at
from public.reports
where status <> 'closed';

grant select on public.v_public_reports to anon, authenticated;

-- 3) Secure submit path. SECURITY DEFINER so anon can file a report (and
--    photos) without any direct INSERT/SELECT grant on the reports table.
--    contact_info is accepted but only ever written here, never read back
--    through the public view.
create or replace function public.submit_report(
  p_report_type public.report_type,
  p_location_text text,
  p_latitude double precision,
  p_longitude double precision,
  p_details text,
  p_contact_info text default null,
  p_photo_urls text[] default '{}'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_url text;
begin
  insert into public.reports (report_type, location_text, latitude, longitude, details, contact_info, status)
  values (p_report_type, p_location_text, p_latitude, p_longitude, p_details, p_contact_info, 'new')
  returning id into v_id;

  if p_photo_urls is not null then
    foreach v_url in array p_photo_urls loop
      if v_url is not null and length(trim(v_url)) > 0 then
        insert into public.report_photos (report_id, file_url) values (v_id, v_url);
      end if;
    end loop;
  end if;

  return v_id;
end;
$$;

revoke all on function public.submit_report(public.report_type, text, double precision, double precision, text, text, text[]) from public;
grant execute on function public.submit_report(public.report_type, text, double precision, double precision, text, text, text[]) to anon, authenticated;
