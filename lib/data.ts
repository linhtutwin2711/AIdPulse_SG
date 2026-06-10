// Typed accessors over the mock fixtures. Pages/components import from HERE,
// never from `constants/` directly — so a teammate can replace each function
// body with a Supabase query later without touching the UI.

import {
  activeCases,
  areaRanks,
  caseMarkers,
  caseStats,
  conversations,
  currentUser,
  highRiskAlert,
  hospitals,
  missions,
  newsUpdates,
  opportunities,
  peopleDirectory,
  reportTypes,
} from "@/constants";
import type {
  ActiveCase,
  Alert,
  AreaRank,
  CaseStats,
  CaseType,
  Conversation,
  Friend,
  Hospital,
  Mission,
  MissionStatus,
  NewsUpdate,
  Opportunity,
  ReportTypeId,
  Severity,
  VolunteerStats,
} from "@/types";
import { supabase } from "@/lib/supabaseClient";

export const getCaseStats = () => caseStats;
export const getAreaRanks = () => areaRanks;
export const getCaseMarkers = () => caseMarkers;

// Individual reported cases shown as clickable dots on the map.
// Returns only currently-active cases. Kept deterministic (no Date.now in the
// render path) to avoid SSR/hydration drift.
//
// Supabase equivalent (teammate wires this later):
//   const { data } = await supabase
//     .from("active_cases")
//     .select("*")
//     .eq("status", "active")
//     .gt("expires_at", new Date().toISOString());
export const getActiveCases = (): ActiveCase[] =>
  activeCases.filter((c) => c.status === "active");

// Dot/accent colour by case type — matches the map legend and filters.
export const caseTypeColor: Record<CaseType, string> = {
  dengue: "#ef4444",
  covid: "#3b82f6",
  flu: "#f59e0b",
  heatstroke: "#f97316",
  foodborne: "#22c55e",
  other: "#a855f7",
};

export const caseTypeLabel: Record<CaseType, string> = {
  dengue: "Dengue",
  covid: "COVID-19",
  flu: "Influenza",
  heatstroke: "Heatstroke",
  foodborne: "Foodborne",
  other: "Other",
};

// Dot/accent colour for citizen reports, keyed by the report type the user
// picked (independent of the disease caseType used by the legend filters).
export const reportTypeColor: Record<ReportTypeId, string> = {
  symptom: "#ef4444", // red
  exposure: "#f97316", // orange
  positive: "#ef4444", // red
  crowded: "#3b82f6", // blue
  disaster: "#eab308", // yellow
  other: "#9ca3af", // grey
};

export const reportTypeLabel: Record<ReportTypeId, string> = {
  symptom: "Symptom",
  exposure: "Exposure",
  positive: "Positive Test",
  crowded: "Crowded Area",
  disaster: "Natural Disaster",
  other: "Others",
};
export const getHighRiskAlert = () => highRiskAlert;
export const getNewsUpdates = () => newsUpdates;
export const getHospitals = (): Hospital[] => hospitals;
export const getHospital = (id: string) => hospitals.find((h) => h.id === id);
export const getReportTypes = () => reportTypes;
export const getCurrentUser = () => currentUser;

export const getMissions = (status?: MissionStatus): Mission[] =>
  status ? missions.filter((m) => m.status === status) : missions;

/**
 * Volunteer stats are derived from the mission list, not stored as fixed
 * numbers — so they stay consistent as missions are checked out:
 *  - totalMissions: every mission you took on (excludes cancelled)
 *  - hours: total logged hours
 *  - livesSupported: sum of beneficiaries recorded at check-out
 */
export const deriveVolunteerStats = (list: Mission[]): VolunteerStats => ({
  totalMissions: list.filter((m) => m.status !== "cancelled").length,
  hours: list.reduce((sum, m) => sum + m.hours, 0),
  livesSupported: list.reduce((sum, m) => sum + (m.beneficiaries ?? 0), 0),
});

export const getOpportunities = (): Opportunity[] => opportunities;

export const getConversations = (): Conversation[] => conversations;
export const getConversation = (id: string) =>
  conversations.find((c) => c.id === id);

// People you can connect with (the friend directory).
// Supabase equivalent: supabase.from("profiles").select("*")
export const getPeopleDirectory = (): Friend[] => peopleDirectory;

// Hospital bed availability summary. Occupancy bands: high > 80, medium 50–80, low < 50.
export const bedSummary = (h: Hospital) => {
  const total = h.totalBeds;
  const occupied = h.occupied;
  const available = h.available;
  const occupancy = h.occupancy;
  const status: "available" | "limited" | "full" =
    occupancy > 80 ? "full" : occupancy >= 50 ? "limited" : "available";
  return { total, occupied, available, occupancy, status };
};

export type OccupancyBand = "high" | "medium" | "low";
export const occupancyBand = (occupancy: number): OccupancyBand =>
  occupancy > 80 ? "high" : occupancy >= 50 ? "medium" : "low";

// ---------------------------------------------------------------------------
// LIVE Supabase accessors — citizen dashboard
//
// These mirror the mock accessors above but read from Supabase, mapping each
// row into the SAME domain type so the UI is unchanged. They run client-side
// (browser anon client), so the citizen dashboard's leaf components fetch them
// in useEffect. The mock accessors are left intact because other screens
// (volunteer/officer dashboards, /updates) still depend on them.
// ---------------------------------------------------------------------------

// Severity is not exposed by v_area_ranking, so we derive a visual band from
// the case counts (only drives the ranking bar colour).
function severityFromCases(active: number, critical: number): Severity {
  if (critical >= 10) return "critical";
  if (critical >= 3 || active >= 200) return "high";
  if (active >= 80) return "moderate";
  return "low";
}

// Map a free-text risk_level (e.g. "High") onto the Severity enum.
function severityFromRisk(risk: string | null): Severity {
  const r = (risk ?? "").toLowerCase();
  if (r.includes("crit")) return "critical";
  if (r.includes("high")) return "high";
  if (r.includes("med") || r.includes("mod")) return "moderate";
  if (r.includes("low")) return "low";
  return "high";
}

// Human "x min ago" label from an ISO timestamp. Safe to use Date.now here:
// these accessors run in useEffect (client), never in the SSR render path.
function timeAgo(iso: string | null): string {
  if (!iso) return "just now";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "just now";
  const sec = Math.max(1, Math.floor(ms / 1000));
  if (sec < 60) return `${sec} sec ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr${hr > 1 ? "s" : ""} ago`;
  const day = Math.floor(hr / 24);
  return `${day} day${day > 1 ? "s" : ""} ago`;
}

// Active/Critical numbers — VIEW v_case_tracking returns a single row.
// The view exposes no day-over-day delta, so activeDelta/criticalDelta are 0.
export async function fetchCaseStats(): Promise<CaseStats> {
  const { data, error } = await supabase
    .from("v_case_tracking")
    .select("active_cases, critical_cases")
    .maybeSingle();

  if (error || !data) {
    return {
      activeCases: 0,
      activeDelta: 0,
      criticalCases: 0,
      criticalDelta: 0,
      updatedAgo: "just now",
    };
  }

  return {
    activeCases: data.active_cases ?? 0,
    activeDelta: 0,
    criticalCases: data.critical_cases ?? 0,
    criticalDelta: 0,
    updatedAgo: "just now",
  };
}

// "Areas by Active Cases" — VIEW v_area_ranking, ordered by ranking.
export async function fetchAreaRanks(): Promise<AreaRank[]> {
  const { data, error } = await supabase
    .from("v_area_ranking")
    .select("area_name, active_cases, critical_cases, ranking")
    .order("ranking", { ascending: true });

  if (error || !data) return [];

  return data.map((r) => ({
    rank: r.ranking,
    area: r.area_name,
    cases: r.active_cases ?? 0,
    severity: severityFromCases(r.active_cases ?? 0, r.critical_cases ?? 0),
  }));
}

// HIGH RISK AREA banner — TABLE case_clusters, the row with is_banner = true.
// Returns null when there is no banner row (the wrapper renders nothing).
// distanceKm / precautions / nearbyAreas aren't in the schema, so they're left
// undefined; the banner + modal render those sections conditionally.
export async function fetchBannerAlert(): Promise<Alert | null> {
  const { data, error } = await supabase
    .from("case_clusters")
    .select(
      "disease, title, description, area_name, active_cases, critical_cases, risk_level, is_banner",
    )
    .eq("is_banner", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: `banner-${data.area_name}`,
    area: data.area_name,
    title: data.title,
    message: data.description,
    severity: severityFromRisk(data.risk_level),
    updatedAgo: "just now",
    riskLevel: data.risk_level ?? "High",
    activeCases: data.active_cases ?? undefined,
    details: data.description ?? undefined,
  };
}

// "Latest Updates" feed — TABLE news_updates, published rows newest first.
// source / comments / reposts / views aren't in the schema, so they fall back
// to neutral defaults.
export async function fetchNewsUpdates(): Promise<NewsUpdate[]> {
  const { data, error } = await supabase
    .from("news_updates")
    .select("id, title, summary, image_url, is_live, status, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((n) => ({
    id: String(n.id),
    title: n.title,
    source: "AidPulse Update",
    description: n.summary ?? "",
    ago: timeAgo(n.created_at),
    image: n.image_url ?? "",
    live: n.is_live ?? false,
    comments: 0,
    reposts: 0,
    views: "0",
  }));
}
