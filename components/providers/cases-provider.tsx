"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getActiveCases } from "@/lib/data";
import { SG_CENTER } from "@/constants";
import type { ActiveCase, CaseType, ReportTypeId, RiskLevel } from "@/types";

// Holds the live list of reported cases. Seeded from the mock fixtures; new
// reports submitted on the Alert/Report page are appended here so they appear
// as dots on the Map page immediately. Persisted to localStorage.
//
// Supabase later: addCase → INSERT into `active_cases`, the seed read becomes a
// SELECT, and a realtime subscription replaces the localStorage sync.

type NewCaseInput = {
  caseType: CaseType;
  reportType?: ReportTypeId;
  title: string;
  locationName: string;
  description: string;
  imageUrls: string[];
  riskLevel?: RiskLevel;
  reportedBy?: string;
  lat?: number;
  lng?: number;
  disasterType?: string;
  contactPhone?: string;
  contactEmail?: string;
  expiresAt?: string; // ISO — when omitted, defaults to 7 days out
};

interface CasesContextValue {
  cases: ActiveCase[];
  addCase: (input: NewCaseInput) => ActiveCase;
  resolveCase: (id: string) => void;
}

const CasesContext = createContext<CasesContextValue | null>(null);
const STORAGE_KEY = "aidpulse:cases";

export function CasesProvider({ children }: { children: React.ReactNode }) {
  const [cases, setCases] = useState<ActiveCase[]>(() => getActiveCases());

  // Hydrate after mount: keep saved cases, and merge in any seed not yet stored
  // (so fixture updates still surface). Avoids SSR/hydration drift.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as ActiveCase[];
      const ids = new Set(saved.map((c) => c.id));
      const merged = [...saved, ...getActiveCases().filter((s) => !ids.has(s.id))];
      setCases(merged);
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  const persist = (next: ActiveCase[]) => {
    setCases(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const addCase = (input: NewCaseInput): ActiveCase => {
    // Place near the map centre with a small spread so reports don't stack.
    const jitter = () => (Math.random() - 0.5) * 0.05;
    const now = new Date();
    // Caller passes a type-based expiry; fall back to 7 days. The map hides rows
    // past expires_at (Supabase later does this in the query).
    const expires = input.expiresAt ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const item: ActiveCase = {
      id: `ac-${Math.random().toString(36).slice(2, 9)}`,
      caseType: input.caseType,
      reportType: input.reportType,
      title: input.title,
      locationName: input.locationName || "Reported location",
      lat: input.lat ?? SG_CENTER[0] + jitter(),
      lng: input.lng ?? SG_CENTER[1] + jitter(),
      distanceKm: Math.round((0.5 + Math.random() * 8) * 10) / 10,
      reportedAgo: "Just now",
      status: "active",
      riskLevel: input.riskLevel ?? "medium",
      description: input.description || "No additional details provided.",
      imageUrls: input.imageUrls,
      reportedBy: input.reportedBy || "Citizen Report",
      nearbyCases: Math.floor(Math.random() * 6),
      disasterType: input.disasterType,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      createdAt: now.toISOString(),
      expiresAt: expires,
    };
    persist([item, ...cases]);
    return item;
  };

  const resolveCase = (id: string) =>
    persist(cases.map((c) => (c.id === id ? { ...c, status: "resolved" } : c)));

  const value = useMemo<CasesContextValue>(
    () => ({ cases, addCase, resolveCase }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cases]
  );
  return <CasesContext.Provider value={value}>{children}</CasesContext.Provider>;
}

export function useCases() {
  const ctx = useContext(CasesContext);
  if (!ctx) throw new Error("useCases must be used within CasesProvider");
  return ctx;
}
