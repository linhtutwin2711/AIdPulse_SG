// Bed-availability overrides: the bridge between the Emergency Officer's bed
// editor (/officer/beds) and what citizens/responders see on the map.
//
// The officer edits their hospital ward-by-ward; those per-department occupied
// counts are saved to localStorage under `aidpulse:beds:<hospitalId>`. The map
// reads hospitals from `fetchHospitals()` (which doesn't know about local
// edits), so it applies these overrides on top — recomputing the occupancy
// summary — so an officer's update shows up immediately on the map.
//
// (Supabase later: an UPDATE on a `hospital_departments` table would make this
// cross-device; localStorage keeps it working in a single-browser demo.)

import type { Hospital } from "@/types";

/** Storage key for a hospital's officer-edited bed counts (`{ dept: occupied }`). */
export const bedOverrideKey = (hospitalId: string) => `aidpulse:beds:${hospitalId}`;

/** Reads the officer's saved per-department occupied counts, or null if none. */
export function readBedOverride(hospitalId: string): Record<string, number> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(bedOverrideKey(hospitalId));
    return raw ? (JSON.parse(raw) as Record<string, number>) : null;
  } catch {
    return null;
  }
}

/**
 * Applies any officer bed edits onto a hospital, recomputing the occupancy
 * summary (totals, available, occupancy %) so the map detail panel, the marker
 * colour, and the department bars all reflect the live numbers. Returns the
 * hospital unchanged when there are no local edits for it.
 */
export function applyBedOverride(h: Hospital): Hospital {
  const override = readBedOverride(h.id);
  if (!override) return h;

  const departments = h.departments.map((d) => ({
    ...d,
    occupied: Math.max(0, Math.min(d.total, override[d.name] ?? d.occupied)),
  }));
  const totalBeds = departments.reduce((s, d) => s + d.total, 0);
  const occupied = departments.reduce((s, d) => s + d.occupied, 0);
  const available = totalBeds - occupied;
  const occupancy = totalBeds ? Math.round((occupied / totalBeds) * 100) : 0;

  return { ...h, departments, totalBeds, occupied, available, occupancy };
}

/** Applies officer bed edits across a list of hospitals. */
export function applyBedOverrides(hospitals: Hospital[]): Hospital[] {
  return hospitals.map(applyBedOverride);
}
