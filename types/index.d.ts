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
  url?: string; // real source article URL (opens externally when present)
}

// Real-time public-health update, ingested into the `latest_updates` table by
// the n8n workflow and read by the citizen dashboard's Latest Updates section.
export interface LatestUpdate {
  id: string; // update_id
  title: string;
  summary: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  category: string | null;
  location: string | null;
  severity: string | null;
  imageUrl: string | null;
  publishedAt: string | null; // ISO
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
  // People supported on this mission, recorded by the volunteer at check-out.
  // Summed across completed missions to produce VolunteerStats.livesSupported.
  beneficiaries?: number;
  // Opportunity this mission was created from (set when a volunteer applies).
  opportunityId?: string;
  // Check-in code an officer generates and embeds in the mission QR; the
  // volunteer enters/scans it to check in.
  checkInCode?: string;
  // ISO timestamp set at check-in; drives the minimum on-site time lock before
  // check-out is allowed.
  checkInAt?: string;
  // Set when a volunteer cancels an assigned mission. `cancelReason` is a
  // quick-pick label, `cancelNote` an optional free-text note. The officer sees
  // these under the volunteer's profile; `cancelSeen` flips true once they have.
  cancelReason?: string;
  cancelNote?: string;
  cancelledAt?: string; // ISO
  cancelSeen?: boolean;
}

/** A cancellation as surfaced to the officer under a volunteer's profile. */
export interface MissionCancellation {
  title: string;
  reason: string;
  note?: string;
  when: string; // human label, e.g. "2 days ago" or a date
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
  // Estimated shift length; carried onto the mission when a volunteer applies.
  hours?: number;
  // How many volunteers are needed (capacity). Officer sets this when posting;
  // the volunteer list shows filled/slots (e.g. 1/5).
  slots?: number;
  // Volunteers already signed up before the current user (seed baseline). The
  // signed-in volunteer's own active application is added on top of this.
  filled?: number;
  // ISO timestamp set when an officer posts the opportunity. Drives the "New"
  // pill and newest-first ordering in the volunteer list. Undefined for the
  // original seed opportunities.
  createdAt?: string;
}

/** A volunteer as seen on the officer roster (their live impact stats). */
export interface VolunteerProfile {
  id: string;
  name: string;
  initials: string;
  skills: string[];
  stats: VolunteerStats;
  // True for the signed-in volunteer, whose stats are computed live.
  you?: boolean;
  // Missions this volunteer cancelled, shown to the officer under their profile.
  cancellations?: MissionCancellation[];
}

export interface ChatMessage {
  id: string;
  author: string;
  initials: string;
  text: string;
  time: string;
  self?: boolean;
}

// A person you can connect with. The mock directory in `constants/friends.ts`
// implements this; a Supabase `profiles` query replaces it later.
export interface Friend {
  id: string;
  name: string;
  initials: string;
  role?: Role;
  area?: string;
  online?: boolean;
  mutualFriends?: number;
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
