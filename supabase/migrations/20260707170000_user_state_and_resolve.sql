-- Persist friends, missions, and case resolution
-- ---------------------------------------------------------------------------
-- Same phone-keyed, SECURITY-DEFINER-RPC model as volunteer_profiles. Friends
-- and missions are stored as one blob per phone (mirroring the localStorage
-- shape the providers already use), so the providers only swap their storage
-- read/write — the game logic is unchanged. resolve_report flips a report's
-- status so an officer's "resolve" persists.
--
-- Idempotent: safe to re-run.

-- ── Friends: the person-ids a phone has added ───────────────────────────────
create table if not exists public.user_friends (
  phone      text primary key,          -- E.164 identity key
  friend_ids text[] default '{}',        -- ids into the app's people directory
  updated_at timestamptz default now()
);
alter table public.user_friends enable row level security;

create or replace function public.set_user_friends(p_phone text, p_friend_ids text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_phone is null or length(trim(p_phone)) = 0 then
    raise exception 'phone is required';
  end if;
  insert into public.user_friends (phone, friend_ids, updated_at)
  values (p_phone, coalesce(p_friend_ids, '{}'), now())
  on conflict (phone) do update set friend_ids = excluded.friend_ids, updated_at = now();
end; $$;

create or replace function public.get_user_friends(p_phone text)
returns text[] language sql security definer set search_path = public as $$
  select coalesce((select friend_ids from public.user_friends where phone = p_phone), '{}');
$$;

-- ── Missions: the volunteer's mission list (full state machine as JSON) ──────
create table if not exists public.user_missions (
  phone      text primary key,
  missions   jsonb default '[]',
  updated_at timestamptz default now()
);
alter table public.user_missions enable row level security;

create or replace function public.set_user_missions(p_phone text, p_missions jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_phone is null or length(trim(p_phone)) = 0 then
    raise exception 'phone is required';
  end if;
  insert into public.user_missions (phone, missions, updated_at)
  values (p_phone, coalesce(p_missions, '[]'), now())
  on conflict (phone) do update set missions = excluded.missions, updated_at = now();
end; $$;

create or replace function public.get_user_missions(p_phone text)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce((select missions from public.user_missions where phone = p_phone), '[]'::jsonb);
$$;

-- ── Resolve a case: officer marks a citizen report resolved ─────────────────
create or replace function public.resolve_report(p_report_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.reports set status = 'resolved' where id = p_report_id;
end; $$;

-- Grants (anon is the app's role; access is only through these functions).
revoke all on function public.set_user_friends(text, text[]) from public;
grant execute on function public.set_user_friends(text, text[]) to anon, authenticated;
revoke all on function public.get_user_friends(text) from public;
grant execute on function public.get_user_friends(text) to anon, authenticated;

revoke all on function public.set_user_missions(text, jsonb) from public;
grant execute on function public.set_user_missions(text, jsonb) to anon, authenticated;
revoke all on function public.get_user_missions(text) from public;
grant execute on function public.get_user_missions(text) to anon, authenticated;

revoke all on function public.resolve_report(uuid) from public;
grant execute on function public.resolve_report(uuid) to anon, authenticated;
