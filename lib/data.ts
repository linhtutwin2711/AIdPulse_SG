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
  CaseMarker,
  CaseStats,
  CaseType,
  Conversation,
  Friend,
  Hospital,
  LatestUpdate,
  Mission,
  MissionStatus,
  NewsUpdate,
  Opportunity,
  ReportTypeId,
  RiskLevel,
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
export const deriveVolunteerStats = (list: Mission[]): VolunteerStats => {
  const active = list.filter((m) => m.status !== "cancelled");
  return {
    totalMissions: active.length,
    hours: active.reduce((sum, m) => sum + m.hours, 0),
    livesSupported: active.reduce((sum, m) => sum + (m.beneficiaries ?? 0), 0),
  };
};

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
// Returns null for unrecognised/empty values so callers can fall back to
// deriving severity from case counts instead of over-stating it as "high".
function severityFromRisk(risk: string | null): Severity | null {
  const r = (risk ?? "").toLowerCase();
  if (r.includes("crit")) return "critical";
  if (r.includes("high")) return "high";
  if (r.includes("med") || r.includes("mod")) return "moderate";
  if (r.includes("low")) return "low";
  return null;
}

// Human "x min ago" label from an ISO timestamp. Safe to use Date.now here:
// these accessors run in useEffect (client), never in the SSR render path.
export function timeAgo(iso: string | null): string {
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

// Active/Critical numbers — VIEW v_case_tracking returns a single row with
// today's live totals plus the day-over-day delta vs the latest snapshot in
// case_stats_snapshots (written by the n8n case-clusters ingest).
export async function fetchCaseStats(): Promise<CaseStats> {
  const { data, error } = await supabase
    .from("v_case_tracking")
    .select("active_cases, critical_cases, active_delta, critical_delta")
    .maybeSingle();

  // A Supabase error (auth/network/schema) is a failure, not an empty state —
  // throw so the calling component's .catch can observe/handle it. A successful
  // query with no row falls through to the zero defaults below.
  if (error) throw error;
  if (!data) {
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
    activeDelta: data.active_delta ?? 0,
    criticalCases: data.critical_cases ?? 0,
    criticalDelta: data.critical_delta ?? 0,
    updatedAgo: "just now",
  };
}

// "Areas by Active Cases" — VIEW v_area_ranking, ordered by ranking.
export async function fetchAreaRanks(): Promise<AreaRank[]> {
  const { data, error } = await supabase
    .from("v_area_ranking")
    .select("area_name, active_cases, critical_cases, ranking")
    .order("ranking", { ascending: true });

  if (error) throw error;
  if (!data) return [];

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
    // Deterministic pick when more than one banner row exists: newest first.
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null; // no is_banner row is a valid empty state, not an error

  return {
    id: `banner-${data.area_name}`,
    area: data.area_name,
    title: data.title,
    message: data.description,
    // Trust an explicit risk_level; otherwise defer to the case-count heuristic
    // rather than letting an unknown value spike severity to "high".
    severity:
      severityFromRisk(data.risk_level) ??
      severityFromCases(data.active_cases ?? 0, data.critical_cases ?? 0),
    updatedAgo: "just now",
    riskLevel: data.risk_level ?? "High",
    activeCases: data.active_cases ?? undefined,
    details: data.description ?? undefined,
  };
}

// "Latest Updates" feed — TABLE news_updates, published rows newest first.
// Ordered by published_at (the article's real publish time, set by the n8n
// ingest) and falling back to created_at for manually-added rows. source /
// comments / reposts / views aren't in the schema, so they fall back to
// neutral defaults; category (if present) is shown as the source label.
export async function fetchNewsUpdates(): Promise<NewsUpdate[]> {
  const { data, error } = await supabase
    .from("news_updates")
    .select("id, title, summary, image_url, category, is_live, status, published_at, created_at")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((n) => ({
    id: String(n.id),
    title: n.title,
    source: n.category ? String(n.category) : "AidPulse Update",
    description: n.summary ?? "",
    ago: timeAgo(n.published_at ?? n.created_at),
    image: n.image_url ?? "",
    live: n.is_live ?? false,
    comments: 0,
    reposts: 0,
    views: "0",
  }));
}

// Real-time "Latest Updates" feed — TABLE latest_updates, populated by the n8n
// ingest workflow. Newest first by published_at; `limit` caps the result set
// (the dashboard preview asks for 5). Safe to call from a Server Component —
// reuses the shared supabase client and reads as anon (see the RLS policy in
// supabase/migrations/20260610130000_latest_updates.sql).
export async function getLatestUpdates(limit = 5): Promise<LatestUpdate[]> {
  const { data, error } = await supabase
    .from("latest_updates")
    .select(
      "update_id, title, summary, source_name, source_url, category, location, severity, image_url, published_at",
    )
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  if (!data) return [];

  return data.map((r) => ({
    id: String(r.update_id),
    title: r.title,
    summary: r.summary ?? null,
    sourceName: r.source_name ?? null,
    sourceUrl: r.source_url ?? null,
    category: r.category ?? null,
    location: r.location ?? null,
    severity: r.severity ?? null,
    imageUrl: r.image_url ?? null,
    publishedAt: r.published_at ?? null,
  }));
}

// Pick a display image for an update. The article's own image_url wins when
// present; otherwise we use a bundled, themed local image keyed off the
// headline so the feed always shows a relevant graphic that loads reliably
// (most health feeds, e.g. Google News, carry no image).
const NEWS_IMAGE_FALLBACKS: { kw: string[]; img: string }[] = [
  { kw: ["dengue", "mosquito", "aedes"], img: "/images/news/health-dengue.svg" },
  { kw: ["covid", "coronavirus", "variant", "sars"], img: "/images/news/health-covid.svg" },
  { kw: ["vaccin", "booster", "immunis", "immuniz", "jab"], img: "/images/news/health-vaccine.svg" },
  { kw: ["flu", "influenza", "fever", "respiratory", "cough"], img: "/images/news/health-flu.svg" },
];
export function newsImage(raw: string | null | undefined, text = ""): string {
  if (raw && raw.trim()) return raw;
  const hay = text.toLowerCase();
  const match = NEWS_IMAGE_FALLBACKS.find((m) => m.kw.some((k) => hay.includes(k)));
  return match?.img ?? "/images/news/health-default.svg";
}

// "View All" feed — latest_updates mapped into the NewsUpdate shape the
// existing PostCard/feed UI consumes, so the /updates page renders live data
// with no component changes. Engagement counts aren't tracked server-side, so
// they start at 0 (the updates provider still layers local reposts/comments).
export async function fetchLatestNews(limit = 30): Promise<NewsUpdate[]> {
  const updates = await getLatestUpdates(limit);
  return updates.map((u) => ({
    id: u.id,
    source: u.sourceName ?? "Gov.sg",
    title: u.title,
    description: u.summary ?? "",
    ago: timeAgo(u.publishedAt),
    image: newsImage(u.imageUrl, `${u.title} ${u.category ?? ""}`),
    live: u.severity === "high" || u.severity === "critical",
    comments: 0,
    reposts: 0,
    views: "0",
    url: u.sourceUrl ?? undefined,
  }));
}

// ---------------------------------------------------------------------------
// LIVE Supabase accessors — Track Cases (Map page)
// ---------------------------------------------------------------------------

// case_clusters.disease (e.g. "covid_19", "influenza") → the CaseType enum the
// map legend + filters use. Unknown diseases fall back to "other".
function caseTypeFromDisease(disease: string | null): CaseType {
  const d = (disease ?? "").toLowerCase();
  if (d.includes("dengue")) return "dengue";
  if (d.includes("covid")) return "covid";
  if (d.includes("flu") || d.includes("influenza")) return "flu";
  if (d.includes("heat")) return "heatstroke";
  if (d.includes("food")) return "foodborne";
  return "other";
}

// Case cluster dots on the map — TABLE case_clusters, one marker per cluster.
// Rows without coordinates can't be placed, so they're skipped.
export async function fetchCaseMarkers(): Promise<CaseMarker[]> {
  const { data, error } = await supabase
    .from("case_clusters")
    .select(
      "disease, area_name, latitude, longitude, active_cases, critical_cases, risk_level",
    );

  if (error) throw error;
  if (!data) return [];

  return data
    .filter((c) => c.latitude != null && c.longitude != null)
    .map((c) => ({
      // area_name is unique per cluster in the seed; avoids depending on an id column.
      id: `cluster-${c.area_name}`,
      area: c.area_name,
      type: caseTypeFromDisease(c.disease),
      // Trust an explicit risk_level; otherwise derive the band from case counts.
      severity:
        severityFromRisk(c.risk_level) ??
        severityFromCases(c.active_cases ?? 0, c.critical_cases ?? 0),
      cases: c.active_cases ?? 0,
      lat: c.latitude,
      lng: c.longitude,
    }));
}

// Hospital markers + bed availability — TABLE hospitals joined to hospital_beds.
// Bed rows are aggregated per hospital (total/occupied/available + occupancy %)
// and each bed row becomes a "department" line in the hospital detail panel.
// Two queries joined in JS so we don't depend on a PostgREST FK embedding.
export async function fetchHospitals(): Promise<Hospital[]> {
  const [hRes, bRes] = await Promise.all([
    supabase.from("hospitals").select("id, name, address, latitude, longitude"),
    supabase
      .from("hospital_beds")
      .select("hospital_id, bed_type, total_beds, available_beds, occupied_beds"),
  ]);

  if (hRes.error) throw hRes.error;
  if (bRes.error) throw bRes.error;

  const beds = bRes.data ?? [];

  return (hRes.data ?? [])
    .filter((h) => h.latitude != null && h.longitude != null)
    .map((h) => {
      const rows = beds.filter((b) => b.hospital_id === h.id);
      const totalBeds = rows.reduce((s, b) => s + (b.total_beds ?? 0), 0);
      const occupied = rows.reduce((s, b) => s + (b.occupied_beds ?? 0), 0);
      const available = rows.reduce((s, b) => s + (b.available_beds ?? 0), 0);
      const occupancy =
        totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;

      return {
        id: String(h.id),
        name: h.name,
        lat: h.latitude,
        lng: h.longitude,
        occupancy,
        totalBeds,
        occupied,
        available,
        address: h.address ?? undefined,
        departments: rows.map((b) => ({
          name: b.bed_type,
          total: b.total_beds ?? 0,
          occupied: b.occupied_beds ?? 0,
        })),
      };
    });
}

// ---------------------------------------------------------------------------
// LIVE Supabase accessors — citizen reports (Track Cases dots)
//
// Reads go through the v_public_reports VIEW (non-PII columns only); writes go
// through the submit_report() SECURITY DEFINER RPC so contact_info is
// write-only and anon never needs direct table access. See the Supabase
// migration for both objects.
// ---------------------------------------------------------------------------

// report_type enum on the DB ⇄ the ReportTypeId the UI uses. "disaster" has no
// DB enum member, so it stores as "others".
const DB_REPORT_TYPE: Record<ReportTypeId, string> = {
  symptom: "symptoms",
  exposure: "exposure",
  positive: "positive_test",
  crowded: "crowded_area",
  disaster: "others",
  other: "others",
};
function reportTypeFromDb(t: string): ReportTypeId {
  switch (t) {
    case "symptoms":
      return "symptom";
    case "exposure":
      return "exposure";
    case "positive_test":
      return "positive";
    case "crowded_area":
      return "crowded";
    default:
      return "other";
  }
}

// Display metadata per report type — mirrors CASE_OF on the report page so a
// report fetched from Supabase looks the same as one just submitted locally.
const REPORT_CASE: Record<ReportTypeId, { caseType: CaseType; title: string; risk: RiskLevel }> = {
  symptom: { caseType: "flu", title: "Influenza Report", risk: "medium" },
  exposure: { caseType: "covid", title: "COVID-19 Report", risk: "medium" },
  positive: { caseType: "covid", title: "COVID-19 Report", risk: "high" },
  crowded: { caseType: "covid", title: "COVID-19 Report", risk: "low" },
  disaster: { caseType: "other", title: "Natural Disaster Report", risk: "high" },
  other: { caseType: "other", title: "Community Report", risk: "low" },
};

// Reported case dots — VIEW v_public_reports (non-PII, status <> 'closed').
// Photos aren't exposed by the view, so imageUrls is empty for live reports.
export async function fetchPublicReports(): Promise<ActiveCase[]> {
  const { data, error } = await supabase
    .from("v_public_reports")
    .select("id, report_type, location_text, latitude, longitude, details, created_at, expires_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => {
      const reportType = reportTypeFromDb(r.report_type);
      const meta = REPORT_CASE[reportType];
      return {
        id: String(r.id),
        caseType: meta.caseType,
        reportType,
        title: meta.title,
        locationName: r.location_text ?? "Reported location",
        lat: r.latitude,
        lng: r.longitude,
        distanceKm: 0,
        reportedAgo: timeAgo(r.created_at),
        status: "active",
        riskLevel: meta.risk,
        description: r.details ?? "",
        imageUrls: [],
        reportedBy: "Citizen Report",
        nearbyCases: 0,
        createdAt: r.created_at ?? undefined,
        expiresAt: r.expires_at ?? undefined,
      };
    });
}

// Submit a citizen report via the SECURITY DEFINER RPC. Returns the new row id.
export async function submitReport(input: {
  reportType: ReportTypeId;
  locationText: string;
  lat: number;
  lng: number;
  details: string;
  contactInfo?: string;
  photoUrls?: string[];
  expiresAt?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("submit_report", {
    p_report_type: DB_REPORT_TYPE[input.reportType],
    p_location_text: input.locationText,
    p_latitude: input.lat,
    p_longitude: input.lng,
    p_details: input.details,
    p_contact_info: input.contactInfo ?? null,
    p_photo_urls: input.photoUrls ?? [],
    p_expires_at: input.expiresAt ?? null,
  });

  if (error) throw error;
  return data as string;
}
