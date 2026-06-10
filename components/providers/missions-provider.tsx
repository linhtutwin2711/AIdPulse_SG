"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { deriveVolunteerStats, getMissions } from "@/lib/data";
import type { Mission, Opportunity, VolunteerStats } from "@/types";

/**
 * Minimum time a volunteer must stay checked in before they can check out.
 * Kept short (60s) so the flow is testable; bump to 1–2 hours for production.
 */
export const CHECKOUT_LOCK_MS = 60_000;

interface MissionsContextValue {
  missions: Mission[];
  // Live rollup derived from `missions` (lives supported, hours, totals).
  stats: VolunteerStats;
  // The mission a volunteer is currently checked into, if any.
  activeMission: Mission | null;
  hasApplied: (opportunityId: string) => boolean;
  // Accepting an opportunity creates an assigned mission that shows in My Missions.
  applyToOpportunity: (opp: Opportunity) => void;
  // Officer assigns/returns a check-in code to embed in the mission QR.
  generateCode: (missionId: string) => string;
  // Volunteer checks in by entering/scanning the code. Returns the matched
  // mission, or null if no assigned mission carries that code.
  checkInWithCode: (code: string) => Mission | null;
  // Records the mission complete and how many people it supported. That count
  // flows straight into stats.livesSupported.
  checkOut: (id: string, beneficiaries: number) => void;
}

const MissionsContext = createContext<MissionsContextValue | null>(null);
const STORAGE_KEY = "aidpulse:missions";

const newCode = () => `AID-${Math.floor(1000 + Math.random() * 9000)}`;

export function MissionsProvider({ children }: { children: React.ReactNode }) {
  const [missions, setMissions] = useState<Mission[]>(() => getMissions());

  // Hydrate any locally-saved progress after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setMissions(JSON.parse(saved));
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  const persist = (next: Mission[]) => {
    setMissions(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const value = useMemo<MissionsContextValue>(() => {
    const update = (id: string, patch: Partial<Mission>) =>
      persist(missions.map((m) => (m.id === id ? { ...m, ...patch } : m)));

    return {
      missions,
      stats: deriveVolunteerStats(missions),
      // The mission you're mid-shift on (checked in, not yet checked out).
      activeMission: missions.find((m) => m.status === "ongoing") ?? null,

      hasApplied: (opportunityId) =>
        missions.some((m) => m.opportunityId === opportunityId),

      applyToOpportunity: (opp) => {
        if (missions.some((m) => m.opportunityId === opp.id)) return;
        const mission: Mission = {
          id: `op-${opp.id}`,
          title: opp.title,
          org: opp.org,
          location: opp.location,
          date: opp.date,
          status: "assigned",
          hours: opp.hours ?? 4,
          opportunityId: opp.id,
        };
        persist([mission, ...missions]);
      },

      generateCode: (missionId) => {
        const existing = missions.find((m) => m.id === missionId);
        if (existing?.checkInCode) return existing.checkInCode;
        const code = newCode();
        update(missionId, { checkInCode: code });
        return code;
      },

      checkInWithCode: (code) => {
        const norm = code.trim().toUpperCase();
        const mission = missions.find(
          (m) => m.checkInCode?.toUpperCase() === norm && m.status === "assigned",
        );
        if (!mission) return null;
        update(mission.id, { status: "ongoing", checkInAt: new Date().toISOString() });
        return { ...mission, status: "ongoing" };
      },

      checkOut: (id, beneficiaries) =>
        update(id, { status: "completed", beneficiaries: Math.max(0, Math.round(beneficiaries)) }),
    };
  }, [missions]);

  return <MissionsContext.Provider value={value}>{children}</MissionsContext.Provider>;
}

export function useMissions() {
  const ctx = useContext(MissionsContext);
  if (!ctx) throw new Error("useMissions must be used within MissionsProvider");
  return ctx;
}
