// Certificate AI — analyses an uploaded volunteer certificate and matches
// volunteering opportunities to what it finds.
//
// Two analysis paths:
//  1. `/api/certificate/analyze` → n8n webhook → Gemini vision (real AI; used
//     automatically when the server has N8N_CERT_WEBHOOK_URL configured).
//  2. On-device heuristic fallback (keyword extraction) so the flow always
//     works in demo/dev without any keys. The UI shows which path ran.
//
// The result shape is identical for both, so wiring the real model later
// changes nothing upstream.

import type { Opportunity } from "@/types";

export interface CertificateAnalysis {
  /** Name of the analysed file. */
  file: string;
  /** What the certificate certifies, e.g. "Standard First Aid + CPR/AED". */
  certification: string;
  /** Skills the certificate maps to, in the app's skill vocabulary. */
  skills: string[];
  /** 0–1 how confident the analysis is. */
  confidence: number;
  /** Which engine produced this: real model or on-device fallback. */
  source: "gemini" | "on-device";
}

// Recognisable certifications → app skill tags. Order matters: first match
// names the certification; all matches contribute skills.
const KNOWN_CERTS: { pattern: RegExp; certification: string; skills: string[] }[] = [
  { pattern: /first[\s_-]?aid/i, certification: "Standard First Aid Certificate", skills: ["First Aid", "Healthcare Support"] },
  { pattern: /cpr|aed|resus/i, certification: "CPR + AED Certification", skills: ["First Aid", "Healthcare Support"] },
  { pattern: /nurs|medic|health|clinic/i, certification: "Healthcare / Medical Certification", skills: ["Healthcare Support", "Hospital Role"] },
  { pattern: /psych|counsel|mental/i, certification: "Psychological First Aid / Counselling", skills: ["Counselling", "Healthcare Support"] },
  { pattern: /logisti|forklift|warehous|driv/i, certification: "Logistics / Operations Certification", skills: ["Logistics"] },
  { pattern: /teach|tutor|educat|train/i, certification: "Teaching / Training Certification", skills: ["Teaching"] },
  { pattern: /food|hygien|haccp/i, certification: "Food Safety & Hygiene Certificate", skills: ["Food Handling", "General Volunteer"] },
  { pattern: /lifeguard|swim/i, certification: "Lifesaving Certification", skills: ["First Aid", "General Volunteer"] },
  { pattern: /translat|language|interpret/i, certification: "Language / Interpretation Certification", skills: ["Translation", "General Volunteer"] },
  { pattern: /security|marshal|crowd/i, certification: "Safety & Crowd Management Certification", skills: ["Crowd Management", "General Volunteer"] },
];

/**
 * On-device fallback: reads signals from the file name plus whatever the user
 * typed in the skills field. A real certificate parser (Gemini vision via
 * n8n) replaces this transparently when the webhook is configured.
 */
export function analyzeLocally(fileName: string, hints = ""): CertificateAnalysis {
  const haystack = `${fileName} ${hints}`;
  const matches = KNOWN_CERTS.filter((c) => c.pattern.test(haystack));
  const skills = [...new Set(matches.flatMap((c) => c.skills))];

  if (matches.length === 0) {
    return {
      file: fileName,
      certification: "General certificate",
      skills: ["General Volunteer"],
      confidence: 0.4,
      source: "on-device",
    };
  }
  return {
    file: fileName,
    certification: matches[0].certification,
    skills,
    confidence: Math.min(0.95, 0.6 + matches.length * 0.15),
    source: "on-device",
  };
}

/**
 * Analyse one certificate file. Tries the server AI first; falls back to the
 * on-device heuristic when the webhook isn't configured or errors.
 */
export async function analyzeCertificate(file: File, hints = ""): Promise<CertificateAnalysis> {
  try {
    const body = new FormData();
    body.append("file", file);
    body.append("hints", hints);
    const res = await fetch("/api/certificate/analyze", { method: "POST", body });
    if (res.ok) {
      const data = (await res.json()) as Omit<CertificateAnalysis, "source" | "file">;
      return { ...data, file: file.name, source: "gemini" };
    }
  } catch {
    /* fall through to the on-device path */
  }
  // Small delay so the analysing state is visible and the UX reads as "working".
  await new Promise((r) => setTimeout(r, 700));
  return analyzeLocally(file.name, hints);
}

// ---------------------------------------------------------------------------
// Opportunity matching

export interface OpportunityMatch {
  opportunity: Opportunity;
  score: number;
  /** Human-readable "why this matches you" lines. */
  reasons: string[];
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Rank opportunities against the volunteer's skills (typed + extracted from
 * certificates). Skill overlap dominates; urgency and distance break ties.
 * Supabase/n8n equivalent later: an LLM re-ranker over the same inputs.
 */
export function matchOpportunities(
  skills: string[],
  opportunities: Opportunity[],
  hasCertificate: boolean
): OpportunityMatch[] {
  const mine = new Set(skills.map(norm));

  return opportunities
    .map((o) => {
      const reasons: string[] = [];
      let score = 0;

      const wanted = [...o.skills, o.roleType];
      const overlap = wanted.filter((s) => mine.has(norm(s)));
      if (overlap.length) {
        score += overlap.length * 3;
        reasons.push(`Matches your ${[...new Set(overlap)].join(", ")} skills`);
      }
      if (hasCertificate && o.skills.some((s) => /certificate required/i.test(s))) {
        score += 3;
        reasons.push("Your uploaded certificate unlocks this role");
      }
      if (o.urgency === "urgent") {
        score += 1;
        reasons.push("Urgently needs volunteers today");
      }
      if (o.distanceKm <= 2) {
        score += 1;
        reasons.push(`Only ${o.distanceKm} km away`);
      }

      return { opportunity: o, score, reasons };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Volunteer skill profile — persisted so the Opportunities page's
// "Certificate Match" tab reflects the AI analysis after registration.
// Supabase later: a `volunteer_profiles.skills` column.

const SKILLS_KEY = "aidpulse:volunteer-skills";

export function saveVolunteerSkills(skills: string[]) {
  try {
    window.localStorage.setItem(SKILLS_KEY, JSON.stringify([...new Set(skills)]));
  } catch {
    /* ignore */
  }
}

export function loadVolunteerSkills(): string[] {
  try {
    const raw = window.localStorage.getItem(SKILLS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
