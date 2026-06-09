// Typed accessors over the mock fixtures. Pages/components import from HERE,
// never from `constants/` directly — so a teammate can replace each function
// body with a Supabase query later without touching the UI.

import {
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
  Conversation,
  Hospital,
  Mission,
  MissionStatus,
  Opportunity,
} from "@/types";

export const getCaseStats = () => caseStats;
export const getAreaRanks = () => areaRanks;
export const getCaseMarkers = () => caseMarkers;
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
