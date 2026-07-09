// Real two-account chat bridge — profiles, friendships, messages, officer
// contacts. Keyed by phone (E.164), the app's "no real auth" identity, via the
// SECURITY DEFINER RPCs in supabase/migrations/20260708120000_realtime_chat.sql.
//
// Everything degrades gracefully: with no phone or no Supabase, callers keep
// their existing mock/localStorage behaviour (these helpers return null/[]),
// so the app runs unchanged out of the box.

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Friend } from "@/types";

// Raw row shapes returned by the RPCs.
interface ProfileRow {
  phone: string;
  display_name: string | null;
  initials: string | null;
  role: string | null;
  area: string | null;
  last_seen_at?: string | null;
}

export interface MessageRow {
  id: string;
  sender_phone: string;
  recipient_phone: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

interface OfficerRow {
  hospital_id: string;
  phone: string | null;
  name: string | null;
  initials: string | null;
  online: boolean | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A real account uses its phone as its stable conversation/friend id. */
function profileToFriend(row: ProfileRow): Friend {
  const name = row.display_name?.trim() || row.phone;
  return {
    id: row.phone,
    name,
    initials:
      row.initials?.trim() ||
      name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    phone: row.phone,
    role: (row.role as Friend["role"]) ?? undefined,
    area: row.area ?? undefined,
    online: true,
  };
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export interface ProfileInput {
  displayName?: string | null;
  initials?: string | null;
  role?: string | null;
  area?: string | null;
}

// A profile write that failed (flaky network at sign-up) waits here and is
// re-sent on the next visit — the searchable directory entry is never lost.
const PENDING_PROFILE_KEY = "aidpulse:pending-profile";

type ProfilePayload = {
  p_phone: string;
  p_display_name: string | null;
  p_initials: string | null;
  p_role: string | null;
  p_area: string | null;
};

async function tryRegisterProfile(payload: ProfilePayload): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(400 * attempt);
    const { error } = await supabase.rpc("register_profile", payload);
    if (!error) return true;
    if (attempt === 2) console.warn("[chat] register_profile failed after retries:", error.message);
  }
  return false;
}

/** Re-send a stashed profile write from a previous failed attempt, if any. */
export async function flushPendingProfile(): Promise<void> {
  if (!isSupabaseConfigured || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(PENDING_PROFILE_KEY);
    if (!raw) return;
    if (await tryRegisterProfile(JSON.parse(raw) as ProfilePayload)) {
      window.localStorage.removeItem(PENDING_PROFILE_KEY);
    }
  } catch {
    /* ignore malformed stash */
  }
}

/**
 * Register/refresh the caller's searchable profile. Called on sign-up
 * completion so another account can find this phone. A failed write is stashed
 * and synced on the next visit; no-op without a phone or Supabase.
 */
export async function registerProfile(phone: string | null, input: ProfileInput): Promise<void> {
  if (!phone || !isSupabaseConfigured) return;
  const payload: ProfilePayload = {
    p_phone: phone,
    p_display_name: input.displayName ?? null,
    p_initials: input.initials ?? null,
    p_role: input.role ?? null,
    p_area: input.area ?? null,
  };
  if (await tryRegisterProfile(payload)) return;
  try {
    window.localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(payload));
    console.warn("[chat] profile saved locally — will sync to Supabase on the next visit.");
  } catch {
    /* storage full/blocked */
  }
}

/** EXACT-match phone lookup → the real account, or null. */
export async function findProfileByPhone(phone: string | null): Promise<Friend | null> {
  if (!phone || !isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc("find_profile_by_phone", { p_phone: phone });
  if (error) {
    console.warn("[chat] find_profile_by_phone failed:", error.message);
    return null;
  }
  const row = Array.isArray(data) ? (data[0] as ProfileRow | undefined) : undefined;
  return row ? profileToFriend(row) : null;
}

// ── Friendships ──────────────────────────────────────────────────────────────

/** Befriend an existing account; returns the friend's profile (null if absent). */
export async function addFriendRpc(me: string | null, other: string | null): Promise<Friend | null> {
  if (!me || !other || !isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc("add_friend", { p_me: me, p_other: other });
  if (error) {
    console.warn("[chat] add_friend failed:", error.message);
    return null;
  }
  const row = Array.isArray(data) ? (data[0] as ProfileRow | undefined) : undefined;
  return row ? profileToFriend(row) : null;
}

/** All of a phone's friends as Friend objects. null = not available (fall back). */
export async function getFriends(me: string | null): Promise<Friend[] | null> {
  if (!me || !isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc("get_friends", { p_me: me });
  if (error) {
    console.warn("[chat] get_friends failed:", error.message);
    return null;
  }
  return Array.isArray(data) ? (data as ProfileRow[]).map(profileToFriend) : [];
}

// ── Messages ─────────────────────────────────────────────────────────────────

/** Send a message via the relationship-checked RPC; returns the stored row. */
export async function sendMessageRpc(
  sender: string | null,
  recipient: string | null,
  body: string,
): Promise<MessageRow | null> {
  if (!sender || !recipient || !isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc("send_message", {
    p_sender: sender,
    p_recipient: recipient,
    p_body: body,
  });
  if (error) {
    console.warn("[chat] send_message failed:", error.message);
    return null;
  }
  return Array.isArray(data) ? ((data[0] as MessageRow) ?? null) : (data as MessageRow | null);
}

/** Last N messages between two phones, oldest first. */
export async function getThread(
  a: string | null,
  b: string | null,
  limit = 100,
): Promise<MessageRow[]> {
  if (!a || !b || !isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc("get_thread", { p_a: a, p_b: b, p_limit: limit });
  if (error) {
    console.warn("[chat] get_thread failed:", error.message);
    return [];
  }
  return Array.isArray(data) ? (data as MessageRow[]) : [];
}

/**
 * Subscribe to messages addressed to `myPhone` and fire `onInsert` for each new
 * one, live. Returns an unsubscribe function. No-op (returns a noop) without a
 * phone or Supabase.
 */
let channelSeq = 0;

export function subscribeToMessages(
  myPhone: string | null,
  onInsert: (row: MessageRow) => void,
): () => void {
  if (!myPhone || !isSupabaseConfigured) return () => {};
  // Unique topic per subscription: supabase.channel() returns the SAME instance
  // for a repeated name, so React's dev double-mount would otherwise try to add
  // callbacks to an already-subscribed channel and crash. The postgres_changes
  // filter (not the topic) is what routes the messages.
  const channel = supabase
    .channel(`msgs-${myPhone}-${++channelSeq}-${Date.now().toString(36)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `recipient_phone=eq.${myPhone}` },
      (payload) => onInsert(payload.new as MessageRow),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

// ── Officer contacts ─────────────────────────────────────────────────────────

const PENDING_OFFICER_KEY = "aidpulse:pending-officer-contact";

type OfficerPayload = {
  p_hospital_id: string;
  p_phone: string | null;
  p_name: string | null;
  p_initials: string | null;
};

async function tryRegisterOfficer(payload: OfficerPayload): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(400 * attempt);
    const { error } = await supabase.rpc("register_officer_contact", payload);
    if (!error) return true;
    if (attempt === 2) console.warn("[chat] register_officer_contact failed after retries:", error.message);
  }
  return false;
}

/** Re-send a stashed officer-contact write from a previous failed attempt. */
export async function flushPendingOfficerContact(): Promise<void> {
  if (!isSupabaseConfigured || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(PENDING_OFFICER_KEY);
    if (!raw) return;
    if (await tryRegisterOfficer(JSON.parse(raw) as OfficerPayload)) {
      window.localStorage.removeItem(PENDING_OFFICER_KEY);
    }
  } catch {
    /* ignore malformed stash */
  }
}

/** Register this officer as the duty EO for a hospital, so peers can find them. */
export async function registerOfficerContact(
  hospitalId: string,
  phone: string | null,
  name: string | null,
  initials: string | null,
): Promise<void> {
  if (!hospitalId || !isSupabaseConfigured) return;
  const payload: OfficerPayload = {
    p_hospital_id: hospitalId,
    p_phone: phone,
    p_name: name,
    p_initials: initials,
  };
  if (await tryRegisterOfficer(payload)) return;
  try {
    window.localStorage.setItem(PENDING_OFFICER_KEY, JSON.stringify(payload));
  } catch {
    /* storage full/blocked */
  }
}

export interface OfficerContactLive {
  hospitalId: string;
  phone: string;
  name: string;
  initials: string;
  online: boolean;
}

/** The real registered duty EO for a hospital, or null (fall back to mock). */
export async function findOfficerByHospital(hospitalId: string): Promise<OfficerContactLive | null> {
  if (!hospitalId || !isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc("find_officer_by_hospital", { p_hospital_id: hospitalId });
  if (error) {
    console.warn("[chat] find_officer_by_hospital failed:", error.message);
    return null;
  }
  const row = Array.isArray(data) ? (data[0] as OfficerRow | undefined) : undefined;
  if (!row || !row.phone) return null;
  return {
    hospitalId: row.hospital_id,
    phone: row.phone,
    name: row.name ?? "Duty Officer",
    initials: row.initials ?? "EO",
    online: row.online ?? true,
  };
}
