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

/**
 * Save the volunteer's registration + skills. Always mirrors skills to
 * localStorage (so the Opportunities "Certificate Match" works logged-out), and
 * persists the full profile to Supabase when a phone + Supabase are available.
 */
export async function saveVolunteerProfile(
  phone: string | null,
  input: VolunteerProfileInput,
): Promise<void> {
  saveLocalSkills(input.skills);
  if (!phone || !isSupabaseConfigured) return;
  const { error } = await supabase.rpc("upsert_volunteer_profile", {
    p_phone: phone,
    p_full_name: input.fullName ?? null,
    p_date_of_birth: input.dateOfBirth || null,
    p_gender: input.gender || null,
    p_address: input.address || null,
    p_skills: input.skills,
    p_certifications: input.certifications ?? [],
  });
  if (error) console.error("[volunteer] upsert failed:", error.message);
}

/** Load the volunteer's skills — from Supabase by phone, else localStorage. */
export async function fetchVolunteerSkills(phone: string | null): Promise<string[]> {
  if (phone && isSupabaseConfigured) {
    const { data, error } = await supabase.rpc("get_volunteer_profile", { p_phone: phone });
    if (!error && Array.isArray(data) && data[0]?.skills) {
      return data[0].skills as string[];
    }
  }
  return loadLocalSkills();
}
