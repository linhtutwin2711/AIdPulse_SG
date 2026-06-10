"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getOpportunities } from "@/lib/data";
import type { Opportunity, Urgency } from "@/types";

/**
 * Holds the list of volunteer opportunities. Seeded from the mock fixtures
 * (`lib/data#getOpportunities`) and persisted to localStorage, so opportunities
 * an Emergency Officer posts show up in the volunteer's "Nearby Opportunities"
 * list and survive reloads. Swap the seed/persist for Supabase later — the UI
 * only talks to this provider.
 */
export interface NewOpportunity {
  title: string;
  org: string; // the posting officer's hospital
  location: string;
  date: string;
  roleType: string;
  skills: string[];
  urgency: Urgency;
  hours: number;
  slots: number; // how many volunteers are needed
  distanceKm?: number;
}

interface OpportunitiesContextValue {
  opportunities: Opportunity[];
  // Officer posts a new opportunity under their hospital; returns the created row.
  postOpportunity: (data: NewOpportunity) => Opportunity;
}

const OpportunitiesContext = createContext<OpportunitiesContextValue | null>(null);
const STORAGE_KEY = "aidpulse:opportunities";

export function OpportunitiesProvider({ children }: { children: React.ReactNode }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(() => getOpportunities());

  // Hydrate any locally-saved opportunities after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setOpportunities(JSON.parse(saved));
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  const persist = (next: Opportunity[]) => {
    setOpportunities(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const value = useMemo<OpportunitiesContextValue>(
    () => ({
      opportunities,
      postOpportunity: (data) => {
        const opp: Opportunity = {
          id: `eo-${Date.now().toString(36)}`,
          title: data.title.trim(),
          org: data.org,
          location: data.location,
          date: data.date.trim(),
          distanceKm: data.distanceKm ?? 0,
          roleType: data.roleType,
          skills: data.skills,
          urgency: data.urgency,
          hours: data.hours,
          slots: data.slots,
          filled: 0, // nobody signed up yet when an officer first posts it
          createdAt: new Date().toISOString(),
        };
        persist([opp, ...opportunities]);
        return opp;
      },
    }),
    [opportunities],
  );

  return <OpportunitiesContext.Provider value={value}>{children}</OpportunitiesContext.Provider>;
}

export function useOpportunities() {
  const ctx = useContext(OpportunitiesContext);
  if (!ctx) throw new Error("useOpportunities must be used within OpportunitiesProvider");
  return ctx;
}
