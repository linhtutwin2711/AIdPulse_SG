// Phone-keyed persistence for friends, missions, and case resolution — the
// same SECURITY DEFINER RPC model as volunteer_profiles / submit_report. Each
// helper takes the phone key (from lib/volunteer.phoneKey); when phone or
// Supabase is unavailable the callers keep their localStorage behaviour.

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Mission } from "@/types";

/** UUID check — only Supabase-sourced report ids can be resolved server-side. */
export const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// ── Friends ─────────────────────────────────────────────────────────────────
export async function fetchFriendIds(phone: string | null): Promise<string[] | null> {
  if (!phone || !isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc("get_user_friends", { p_phone: phone });
  if (error) {
    console.error("[friends] load failed:", error.message);
    return null;
  }
  return Array.isArray(data) ? (data as string[]) : [];
}

export async function saveFriendIds(phone: string | null, ids: string[]): Promise<void> {
  if (!phone || !isSupabaseConfigured) return;
  const { error } = await supabase.rpc("set_user_friends", { p_phone: phone, p_friend_ids: ids });
  if (error) console.error("[friends] save failed:", error.message);
}

// ── Missions ────────────────────────────────────────────────────────────────
export async function fetchUserMissions(phone: string | null): Promise<Mission[] | null> {
  if (!phone || !isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc("get_user_missions", { p_phone: phone });
  if (error) {
    console.error("[missions] load failed:", error.message);
    return null;
  }
  return Array.isArray(data) ? (data as Mission[]) : [];
}

export async function saveUserMissions(phone: string | null, missions: Mission[]): Promise<void> {
  if (!phone || !isSupabaseConfigured) return;
  const { error } = await supabase.rpc("set_user_missions", { p_phone: phone, p_missions: missions });
  if (error) console.error("[missions] save failed:", error.message);
}

// ── Resolve a case ───────────────────────────────────────────────────────────
export async function resolveReport(reportId: string): Promise<void> {
  if (!isSupabaseConfigured || !isUuid(reportId)) return;
  const { error } = await supabase.rpc("resolve_report", { p_report_id: reportId });
  if (error) console.error("[cases] resolve failed:", error.message);
}
