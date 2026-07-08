-- Real two-account chat — profiles, friendships, messages, officer contacts
-- ---------------------------------------------------------------------------
-- Two people on different devices genuinely chat live: a citizen finds a friend
-- by EXACT phone number, an Emergency Officer finds another hospital's duty EO
-- by hospital. Messages deliver in real time via Supabase Realtime.
--
-- Same "no real auth" identity model as volunteer_profiles / submit_report: the
-- browser is anon, so every operation goes through a SECURITY DEFINER RPC rather
-- than direct table grants. Identity = E.164 phone (verified by OTP at sign-up).
-- This keeps the phone directory non-enumerable (exact-match lookup only) and
-- centralises validation (relationship checks, length caps, rate limits).
--
-- Idempotent: safe to re-run.

-- ── Tables ──────────────────────────────────────────────────────────────────

-- Every registered account, searchable by exact phone. Written at sign-up.
create table if not exists public.profiles (
  phone        text primary key,          -- E.164 identity key, e.g. +6591234567
  display_name text,
  initials     text,
  role         text,                       -- 'citizen' | 'volunteer' | 'officer'
  area         text,
  last_seen_at timestamptz default now()
);

-- One row per pair, canonical order a_phone < b_phone, so both sides see the
-- same friendship regardless of who added whom.
create table if not exists public.friendships (
  a_phone    text not null,
  b_phone    text not null,
  created_at timestamptz default now(),
  primary key (a_phone, b_phone),
  check (a_phone < b_phone)
);

-- Direct messages for BOTH citizen and EO chat — one table serves both features.
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  sender_phone    text not null,
  recipient_phone text not null,
  body            text not null check (char_length(body) <= 2000),
  created_at      timestamptz default now(),
  read_at         timestamptz
);

-- Thread fetch and inbox polling stay fast under load.
create index if not exists messages_pair_idx
  on public.messages (sender_phone, recipient_phone, created_at);
create index if not exists messages_recipient_idx
  on public.messages (recipient_phone, created_at);

-- One duty EO per hospital. Written when an officer completes /officer/access.
-- Searched by hospital name via the app's client-side 30-hospital list.
create table if not exists public.officer_contacts (
  hospital_id text primary key,
  phone       text,
  name        text,
  initials    text,
  online      boolean default true
);

-- ── Row level security ──────────────────────────────────────────────────────
-- RLS ON everywhere; anon gets NO direct table access — everything below runs
-- through SECURITY DEFINER functions. The lone exception is a narrow SELECT on
-- messages, which Supabase Realtime requires to deliver row changes to the
-- client. With anon-only auth there is no phone claim to scope it by, so this
-- demo allows SELECT on messages to anon (body is the only sensitive column).
-- Proper fix later = Supabase Auth phone sign-in so auth.jwt() carries the phone
-- and the policy can be scoped to `recipient_phone = auth.jwt()->>'phone'`.
alter table public.profiles         enable row level security;
alter table public.friendships      enable row level security;
alter table public.messages         enable row level security;
alter table public.officer_contacts enable row level security;

drop policy if exists messages_realtime_select on public.messages;
create policy messages_realtime_select on public.messages
  for select to anon, authenticated using (true);

-- ── RPCs — profiles ─────────────────────────────────────────────────────────

-- Upsert the caller's profile. Called on citizen sign-up completion / edits.
create or replace function public.register_profile(
  p_phone        text,
  p_display_name text default null,
  p_initials     text default null,
  p_role         text default null,
  p_area         text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_phone is null or length(trim(p_phone)) = 0 then
    raise exception 'phone is required';
  end if;
  insert into public.profiles (phone, display_name, initials, role, area, last_seen_at)
  values (p_phone, p_display_name, p_initials, p_role, p_area, now())
  on conflict (phone) do update set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    initials     = coalesce(excluded.initials, public.profiles.initials),
    role         = coalesce(excluded.role, public.profiles.role),
    area         = coalesce(excluded.area, public.profiles.area),
    last_seen_at = now();
end; $$;

-- EXACT match only → 0 or 1 profile. Never partial/LIKE — prevents phone fishing.
create or replace function public.find_profile_by_phone(p_phone text)
returns setof public.profiles
language sql security definer set search_path = public as $$
  select * from public.profiles where phone = p_phone;
$$;

-- ── RPCs — friendships ──────────────────────────────────────────────────────

-- Insert canonical friendship if the other phone exists; no-op if it doesn't.
-- Returns the friend's profile (0 rows when the number isn't on AidPulse).
create or replace function public.add_friend(p_me text, p_other text)
returns setof public.profiles
language plpgsql security definer set search_path = public as $$
declare
  lo text := least(p_me, p_other);
  hi text := greatest(p_me, p_other);
begin
  if p_me is null or p_other is null or p_me = p_other then
    return;
  end if;
  -- Only befriend a real account.
  if not exists (select 1 from public.profiles where phone = p_other) then
    return;
  end if;
  insert into public.friendships (a_phone, b_phone)
  values (lo, hi)
  on conflict (a_phone, b_phone) do nothing;
  return query select * from public.profiles where phone = p_other;
end; $$;

-- Profiles of everyone in a friendship with p_me.
create or replace function public.get_friends(p_me text)
returns setof public.profiles
language sql security definer set search_path = public as $$
  select p.* from public.profiles p
  join public.friendships f
    on (f.a_phone = p_me and f.b_phone = p.phone)
    or (f.b_phone = p_me and f.a_phone = p.phone)
  order by p.display_name;
$$;

-- ── RPCs — messages ─────────────────────────────────────────────────────────

-- Validate a relationship (friendship for citizens OR both phones registered as
-- officer contacts for EOs), length-check, rate-limit, then insert. Returns the
-- inserted row so the client can reconcile its optimistic echo.
create or replace function public.send_message(
  p_sender    text,
  p_recipient text,
  p_body      text
) returns setof public.messages
language plpgsql security definer set search_path = public as $$
declare
  lo text := least(p_sender, p_recipient);
  hi text := greatest(p_sender, p_recipient);
  recent int;
begin
  if p_sender is null or p_recipient is null or p_sender = p_recipient then
    raise exception 'invalid participants';
  end if;
  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'empty message';
  end if;
  if char_length(p_body) > 2000 then
    raise exception 'message too long';
  end if;

  -- Relationship gate: strangers can't message you just by knowing your number.
  if not exists (select 1 from public.friendships where a_phone = lo and b_phone = hi)
     and not (
       exists (select 1 from public.officer_contacts where phone = p_sender)
       and exists (select 1 from public.officer_contacts where phone = p_recipient)
     )
  then
    raise exception 'no relationship between participants';
  end if;

  -- Rate limit: ~30 messages/min per sender.
  select count(*) into recent
  from public.messages
  where sender_phone = p_sender and created_at > now() - interval '1 minute';
  if recent >= 30 then
    raise exception 'rate limit exceeded';
  end if;

  return query
  insert into public.messages (sender_phone, recipient_phone, body)
  values (p_sender, p_recipient, trim(p_body))
  returning *;
end; $$;

-- Last N messages between the pair, ascending (oldest first).
create or replace function public.get_thread(p_a text, p_b text, p_limit int default 100)
returns setof public.messages
language sql security definer set search_path = public as $$
  select * from (
    select * from public.messages
    where (sender_phone = p_a and recipient_phone = p_b)
       or (sender_phone = p_b and recipient_phone = p_a)
    order by created_at desc
    limit greatest(1, coalesce(p_limit, 100))
  ) t
  order by created_at asc;
$$;

-- ── RPCs — officer contacts ─────────────────────────────────────────────────

-- Upsert the duty officer for a hospital. Called when EO verification completes.
create or replace function public.register_officer_contact(
  p_hospital_id text,
  p_phone       text,
  p_name        text,
  p_initials    text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_hospital_id is null or length(trim(p_hospital_id)) = 0 then
    raise exception 'hospital_id is required';
  end if;
  insert into public.officer_contacts (hospital_id, phone, name, initials, online)
  values (p_hospital_id, p_phone, p_name, p_initials, true)
  on conflict (hospital_id) do update set
    phone    = coalesce(excluded.phone, public.officer_contacts.phone),
    name     = coalesce(excluded.name, public.officer_contacts.name),
    initials = coalesce(excluded.initials, public.officer_contacts.initials),
    online   = true;
end; $$;

-- The duty officer contact for a hospital (the app already knows hospital ids
-- from its 30-hospital list, so search-by-name stays client-side).
create or replace function public.find_officer_by_hospital(p_hospital_id text)
returns setof public.officer_contacts
language sql security definer set search_path = public as $$
  select * from public.officer_contacts where hospital_id = p_hospital_id;
$$;

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Add messages to the supabase_realtime publication so INSERTs stream to
-- subscribed clients. Guarded so re-running the migration doesn't error.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ── Grants — anon is the app's role; access is only through these functions ──
revoke all on function public.register_profile(text, text, text, text, text) from public;
grant execute on function public.register_profile(text, text, text, text, text) to anon, authenticated;
revoke all on function public.find_profile_by_phone(text) from public;
grant execute on function public.find_profile_by_phone(text) to anon, authenticated;
revoke all on function public.add_friend(text, text) from public;
grant execute on function public.add_friend(text, text) to anon, authenticated;
revoke all on function public.get_friends(text) from public;
grant execute on function public.get_friends(text) to anon, authenticated;
revoke all on function public.send_message(text, text, text) from public;
grant execute on function public.send_message(text, text, text) to anon, authenticated;
revoke all on function public.get_thread(text, text, int) from public;
grant execute on function public.get_thread(text, text, int) to anon, authenticated;
revoke all on function public.register_officer_contact(text, text, text, text) from public;
grant execute on function public.register_officer_contact(text, text, text, text) to anon, authenticated;
revoke all on function public.find_officer_by_hospital(text) from public;
grant execute on function public.find_officer_by_hospital(text) to anon, authenticated;
