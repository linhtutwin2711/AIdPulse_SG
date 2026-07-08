// Volunteer profile persistence — keyed by phone number (E.164), the app's
// "no real auth" identity. Writes/reads go through SECURITY DEFINER RPCs
// (upsert_volunteer_profile / get_volunteer_profile), mirroring submit_report.
//
// Everything degrades gracefully: with no phone or no Supabase, it falls back to
// the localStorage skill store in lib/certificate-ai.ts, so the flow always works.

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import {
  loadVolunteerSkills as loadLocalSkills,
  saveVolunteerSkills as saveLocalSkills,
  type CertificateAnalysis,
} from "@/lib/certificate-ai";

export interface VolunteerProfileInput {
  fullName?: string | null;
  dateOfBirth?: string | null; // ISO date (yyyy-mm-dd) or empty
  gender?: string | null;
  address?: string | null;
  skills: string[];
  certifications?: CertificateAnalysis[];
}

/** Canonicalise a phone into an E.164-ish key ("+6591234567"), or null if too short. */
export function phoneKey(countryCode: string, phone: string): string | null {
  const digits = `${countryCode ?? ""}${phone ?? ""}`.replace(/\D/g, "");
  return digits.length >= 8 ? `+${digits}` : null;
}

// A profile write that failed (e.g. flaky network at submit time) waits here
// and is re-sent on the next visit — registration data is never lost.
const PENDING_KEY = "aidpulse:pending-volunteer-upsert";

type UpsertPayload = {
  p_phone: string;
  p_full_name: string | null;
  p_date_of_birth: string | null;
  p_gender: string | null;
  p_address: string | null;
  p_skills: string[];
  p_certifications: CertificateAnalysis[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Try the upsert with retries (transient "Failed to fetch" heals on retry). */
async function tryUpsert(payload: UpsertPayload): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(400 * attempt);
    const { error } = await supabase.rpc("upsert_volunteer_profile", payload);
    if (!error) return true;
    if (attempt === 2) console.warn("[volunteer] upsert failed after retries:", error.message);
  }
  return false;
}

/** Re-send a stashed profile write from a previous failed attempt, if any. */
export async function flushPendingVolunteerProfile(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return;
    if (await tryUpsert(JSON.parse(raw) as UpsertPayload)) {
      window.localStorage.removeItem(PENDING_KEY);
    }
  } catch {
    /* ignore malformed stash */
  }
}

/**
 * Save the volunteer's registration + skills. Always mirrors skills to
 * localStorage (so the Opportunities "Certificate Match" works logged-out), and
 * persists the full profile to Supabase when a phone + Supabase are available.
 * A failed write (offline / flaky network) is stashed and synced next visit.
 */
export async function saveVolunteerProfile(
  phone: string | null,
  input: VolunteerProfileInput,
): Promise<void> {
  saveLocalSkills(input.skills);
  if (!phone || !isSupabaseConfigured) return;
  const payload: UpsertPayload = {
    p_phone: phone,
    p_full_name: input.fullName ?? null,
    p_date_of_birth: input.dateOfBirth || null,
    p_gender: input.gender || null,
    p_address: input.address || null,
    p_skills: input.skills,
    p_certifications: input.certifications ?? [],
  };
  if (await tryUpsert(payload)) return;
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(payload));
    console.warn("[volunteer] profile saved locally — will sync to Supabase on the next visit.");
  } catch {
    /* storage full/blocked — localStorage skills mirror still covers the UX */
  }
}

/** Load the volunteer's skills — from Supabase by phone, else localStorage. */
export async function fetchVolunteerSkills(phone: string | null): Promise<string[]> {
  // Piggy-back: opportunities/register pages call this on load, which gives a
  // natural moment to re-send any stashed profile write.
  void flushPendingVolunteerProfile();
  if (phone && isSupabaseConfigured) {
    const { data, error } = await supabase.rpc("get_volunteer_profile", { p_phone: phone });
    if (!error && Array.isArray(data) && data[0]?.skills) {
      return data[0].skills as string[];
    }
  }
  return loadLocalSkills();
}
