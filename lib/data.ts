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
  reportTypes,
  volunteerStats,
} from "@/constants";
import type {
  ActiveCase,
  CaseType,
  Conversation,
  Hospital,
  Mission,
  MissionStatus,
  Opportunity,
  ReportTypeId,
} from "@/types";

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
export const getVolunteerStats = () => volunteerStats;

export const getMissions = (status?: MissionStatus): Mission[] =>
  status ? missions.filter((m) => m.status === status) : missions;

export const getOpportunities = (): Opportunity[] => opportunities;

export const getConversations = (): Conversation[] => conversations;
export const getConversation = (id: string) =>
  conversations.find((c) => c.id === id);

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
