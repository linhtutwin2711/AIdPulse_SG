// Officer-authorization AI — scans the uploaded appointment/authorization
// letter that proves the person is the Emergency Officer of a hospital,
// approved by a higher authority (e.g. MOH Emergency Preparedness Division).
//
// Same two-path design as the volunteer certificate AI:
//  1. `/api/authorization/analyze` → n8n webhook → Gemini vision (real AI,
//     active when N8N_AUTH_WEBHOOK_URL is configured).
//  2. On-device fallback (file-name + hints heuristics) so the flow always
//     demos with zero keys. The UI shows which engine ran.

import { getHospitals } from "@/lib/data";

export interface AuthorizationAnalysis {
  file: string;
  /** Did the document check out as a genuine EO authorization? */
  authorized: boolean;
  documentType: string;
  /** Person the document appoints. */
  holder: string;
  /** Issuing authority, e.g. "Ministry of Health — Emergency Preparedness Division". */
  issuer: string;
  /** The higher-up who approved the appointment. */
  approvedBy: string;
  /** Hospital the appointment is for (matched to the app's hospital list). */
  hospitalId: string | null;
  hospitalName: string | null;
  confidence: number;
  source: "gemini" | "on-device";
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const STOPWORDS = new Set(["general", "hospital", "centre", "center", "community", "national", "singapore"]);

/** Match a hospital from free text: all significant name tokens, or its acronym. */
function detectHospital(haystack: string): { id: string; name: string } | null {
  const h = norm(haystack);
  for (const hosp of getHospitals()) {
    const words = hosp.name.split(/\s+/).filter(Boolean);
    const acronym = norm(words.map((w) => w[0]).join(""));
    const tokens = words.map(norm).filter((w) => !STOPWORDS.has(w) && w.length > 1);
    const tokensHit = tokens.length > 0 && tokens.every((t) => h.includes(t));
    const acronymHit = acronym.length >= 3 && h.includes(acronym);
    if (tokensHit || acronymHit) return { id: hosp.id, name: hosp.name };
  }
  return null;
}

const DOC_PATTERN = /authori[sz]|appoint|approv|clearance|officer|\beo\b|deployment/i;
const ISSUER_PATTERN: [RegExp, string][] = [
  [/moh|ministry.?of.?health/i, "Ministry of Health — Emergency Preparedness Division"],
  [/scdf/i, "Singapore Civil Defence Force"],
  [/nea/i, "National Environment Agency"],
];

/** On-device fallback: reads signals from the file name + hints (e.g. the
 *  signed-in user's name). Gemini vision replaces this transparently. */
export function analyzeAuthorizationLocally(fileName: string, hints = ""): AuthorizationAnalysis {
  const haystack = `${fileName} ${hints}`;
  const hospital = detectHospital(fileName);
  const isAuthDoc = DOC_PATTERN.test(haystack);
  const issuer = ISSUER_PATTERN.find(([re]) => re.test(haystack))?.[1]
    ?? "Ministry of Health — Emergency Preparedness Division";

  const authorized = isAuthDoc && hospital !== null;
  return {
    file: fileName,
    authorized,
    documentType: authorized ? "Emergency Officer Appointment & Authorization Letter" : "Unrecognised document",
    holder: hints.trim() || "Name not detected",
    issuer,
    approvedBy: authorized ? "Director, Emergency Preparedness Division" : "—",
    hospitalId: hospital?.id ?? null,
    hospitalName: hospital?.name ?? null,
    confidence: authorized ? 0.9 : 0.3,
    source: "on-device",
  };
}

/** Analyse the authorization document — server AI first, fallback on-device. */
export async function analyzeAuthorization(file: File, hints = ""): Promise<AuthorizationAnalysis> {
  try {
    const body = new FormData();
    body.append("file", file);
    body.append("hints", hints);
    const res = await fetch("/api/authorization/analyze", { method: "POST", body });
    if (res.ok) {
      const data = (await res.json()) as Omit<AuthorizationAnalysis, "source" | "file" | "hospitalId"> & {
        hospitalName?: string;
      };
      // Map the model's hospital name back onto the app's hospital list.
      const hospital = data.hospitalName ? detectHospital(data.hospitalName) : null;
      return {
        ...data,
        file: file.name,
        hospitalId: hospital?.id ?? null,
        hospitalName: hospital?.name ?? data.hospitalName ?? null,
        source: "gemini",
      };
    }
  } catch {
    /* fall through to the on-device path */
  }
  await new Promise((r) => setTimeout(r, 900)); // visible "scanning" beat
  return analyzeAuthorizationLocally(file.name, hints);
}
