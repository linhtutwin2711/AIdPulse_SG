"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchPublicReports, submitReport } from "@/lib/data";
import { SG_CENTER } from "@/constants";
import type { ActiveCase, CaseType, ReportTypeId, RiskLevel } from "@/types";

// Holds the live list of reported cases shown as dots on the Map page. On mount
// it loads existing reports from Supabase (the v_public_reports view). New
// reports submitted on the Alert/Report page are written through the
// submit_report RPC and ALSO appended optimistically so the dot appears
// instantly (and the /map?caseId= hand-off can select it) without a round-trip.

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

export function CasesProvider({ children }: { children: React.ReactNode }) {
  const [cases, setCases] = useState<ActiveCase[]>([]);

  // Load existing reports from Supabase after mount. Optimistic items added this
  // session are kept (merged by id) so a just-submitted dot isn't dropped if the
  // fetch resolves afterwards.
  useEffect(() => {
    let active = true;
    fetchPublicReports()
      .then((remote) => {
        if (!active) return;
        setCases((local) => {
          const ids = new Set(local.map((c) => c.id));
          return [...local, ...remote.filter((r) => !ids.has(r.id))];
        });
      })
      .catch((err) => console.error("CasesProvider fetchPublicReports failed:", err));
    return () => {
      active = false;
    };
  }, []);

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

    // Show the dot immediately…
    setCases((prev) => [item, ...prev]);

    // …and persist to Supabase via the RPC. Fire-and-forget: the optimistic dot
    // already covers the UI, so a write failure only logs (doesn't block the UX).
    const contactInfo = [item.contactPhone, item.contactEmail].filter(Boolean).join(" | ");
    submitReport({
      reportType: input.reportType ?? "other",
      locationText: item.locationName,
      lat: item.lat,
      lng: item.lng,
      details: item.description,
      contactInfo: contactInfo || undefined,
    }).catch((err) => console.error("CasesProvider submitReport failed:", err));

    return item;
  };

  const resolveCase = (id: string) =>
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, status: "resolved" } : c)));

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
