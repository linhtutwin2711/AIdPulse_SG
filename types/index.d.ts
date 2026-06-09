// AidPulse SG domain models.
// Mock fixtures in `constants/` implement these; `lib/data.ts` is the single
// accessor seam that a real Supabase backend will replace later.

export type Role = "citizen" | "volunteer" | "officer";

export type Severity = "critical" | "high" | "moderate" | "low";

export interface Alert {
  id: string;
  area: string;
  title: string;
  message: string;
  severity: Severity;
  updatedAgo: string;
  // Rich detail shown in the high-risk alert modal.
  riskLevel?: string;
  distanceKm?: number;
  activeCases?: number;
  details?: string;
  precautions?: string[];
  nearbyAreas?: string[];
}

export interface NewsUpdate {
  id: string;
  title: string;
  source: string; // label, e.g. "NEA Alert" / "AidPulse Update"
  description: string;
  ago: string;
  image: string;
  live?: boolean;
  comments: number;
  reposts: number;
  views: string; // e.g. "12.4K"
}

export interface ReplyItem {
  id: string;
  author: string;
  initials: string;
  text: string;
  time: string;
  self?: boolean;
  edited?: boolean;
}

export interface CommentItem {
  id: string;
  author: string;
  initials: string;
  text: string;
  time: string;
  self?: boolean;
  edited?: boolean;
  replies: ReplyItem[];
}

export interface CaseStats {
  activeCases: number;
  activeDelta: number; // vs yesterday
  criticalCases: number;
  criticalDelta: number;
  updatedAgo: string;
}

export interface AreaRank {
  rank: number;
  area: string;
  cases: number;
  severity: Severity;
}

export interface Department {
  name: string;
  total: number;
  occupied: number;
}

export interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  occupancy: number; // 0–100 (%)
  totalBeds: number;
  occupied: number;
  available: number;
  type?: string;
  address?: string;
  phone?: string;
  departments: Department[];
}

export type CaseType =
  | "dengue"
  | "covid"
  | "flu"
  | "heatstroke"
  | "foodborne"
  | "other";

export interface CaseMarker {
  id: string;
  area: string;
  type: CaseType;
  severity: Severity;
  cases: number;
  lat: number;
  lng: number;
}

export type CaseStatus = "active" | "pending" | "resolved" | "expired";
export type RiskLevel = "low" | "medium" | "high";

// An individual reported case (from the Alert/Report page). Mirrors the future
// Supabase `active_cases` table — `lib/data.ts#getActiveCases` is the seam.
export interface ActiveCase {
  id: string;
  caseType: CaseType; // dengue | covid | flu | …  (drives the legend filter)
  reportType?: ReportTypeId; // set for citizen reports — drives the dot colour
  title: string; // e.g. "Dengue Report"
  locationName: string;
  lat: number;
  lng: number;
  distanceKm: number; // distance from the user
  reportedAgo: string; // human label, e.g. "8 min ago"
  status: CaseStatus;
  riskLevel: RiskLevel;
  description: string;
  imageUrls: string[]; // uploaded photos (Supabase Storage URLs later)
  reportedBy: string; // "Citizen Report" | "Anonymous Citizen" | …
  nearbyCases: number;
  disasterType?: string; // only for Natural Disaster reports (Flood, Fire, …)
  contactPhone?: string; // optional reporter contact (with dial code)
  contactEmail?: string; // optional reporter contact
  createdAt?: string; // ISO
  expiresAt?: string; // ISO — getActiveCases hides expired rows later
}

export type MissionStatus = "assigned" | "ongoing" | "completed" | "cancelled";

export interface Mission {
  id: string;
  title: string;
  org: string;
  location: string;
  date: string;
  status: MissionStatus;
  hours: number;
}

export interface VolunteerStats {
  totalMissions: number;
  hours: number;
  livesSupported: number;
}

export type Urgency = "urgent" | "soon" | "flexible";

export interface Opportunity {
  id: string;
  title: string;
  org: string;
  location: string;
  date: string;
  distanceKm: number;
  roleType: string;
  skills: string[];
  urgency: Urgency;
  matched?: boolean;
}

export interface ChatMessage {
  id: string;
  author: string;
  initials: string;
  text: string;
  time: string;
  self?: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  kind: "direct" | "group";
  members?: number;
  lastMessage: string;
  lastTime: string;
  unread?: number;
  online?: boolean;
  messages: ChatMessage[];
}

export type ReportTypeId =
  | "symptom"
  | "exposure"
  | "positive"
  | "crowded"
  | "disaster"
  | "other";

export interface ReportType {
  id: ReportTypeId;
  label: string;
  description: string;
}

export interface Volunteer {
  fullName: string;
  role: Role;
  initials: string;
  stats: VolunteerStats;
}
