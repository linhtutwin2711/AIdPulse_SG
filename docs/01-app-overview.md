# AIdPulse SG — Application Overview

## 1. Product concept

**AIdPulse SG** is an all-in-one emergency-response and health-crisis management platform for
Singapore. Its core idea: emergency information in a crisis is fragmented across agencies, news
outlets, and word of mouth — AIdPulse unifies it into a single dark-themed web app that serves
three distinct user roles.

**Tagline:** *All in one place. Faster Response.*
**Mission:** *Empower communities, strengthen response, and protect lives.*

### The three roles

| Role | What they can do |
|---|---|
| **Citizen** (default) | Report health incidents (symptoms, positive tests, exposure, crowded areas, disasters), view live alerts, track nearby cases and hospital bed availability on an interactive map, read curated health news, chat with the AI assistant |
| **Volunteer** | Everything a citizen can, plus: browse missions and nearby opportunities (filtered by distance, certificates, urgency), check in/out of missions via QR code, track volunteering hours and impact |
| **Emergency Officer** | Everything above, plus: broadcast alerts by area and severity, update hospital bed counts in real time, coordinate with responders through a secure chat. Access is gated by a multi-step verification flow (Officer ID + organisation + passphrase + OTP) |

Role is held client-side in `components/providers/role-provider.tsx` (React context +
localStorage). Onboarding flows set it: volunteer registration → `volunteer`, officer access →
`officer`. A brand-new account always starts as `citizen`.

## 2. Route map

### Public routes
| Route | Purpose |
|---|---|
| `/` | Landing page: phone-based sign-up/log-in with country selector, OTP verification, profile creation, feature highlights |
| `/permissions` | Post-signup permission onboarding: geolocation + notification toggles, privacy policy link |

### Authenticated routes (wrapped in `AppShell`: top nav + global AI assistant)

**Citizen**
| Route | Purpose |
|---|---|
| `/dashboard` | High-risk alert banner, Latest Updates feed, Real-time Case Tracking stats (with vs-yesterday deltas), Areas by Active Cases ranking, role-switch cards |
| `/map` | Full-bleed Leaflet map of Singapore. Left panel: search + layer filters (case types: dengue/COVID/flu; hospital occupancy bands). Right panel: contextual hospital or case detail. Citizen reports appear as coloured dots; deep-links via `?caseId=` |
| `/report` | Multi-step incident report: type → location (manual or geolocation + reverse-geocode) → details → photos (up to 5) → optional contact. Reports get type-based expiry (crowded = 1 day, symptom/exposure/positive = 7 days, disaster/other = 3 days) and land on the map immediately |
| `/updates` | Health news feed with side navigation, disease filters, repost/comment threads, and direct messages |

**Volunteer**
| Route | Purpose |
|---|---|
| `/volunteer/dashboard` | Volunteer variant of the dashboard with mission/opportunity/check-in action cards |
| `/volunteer/missions` | Mission list with status filters and impact stats (hours, lives supported) |
| `/volunteer/opportunities` | Nearby opportunities with tabs: All / Near Me / Certificate Match / Urgent |
| `/volunteer/checkin` | QR scanner + manual code entry for mission check-in/out |

**Officer**
| Route | Purpose |
|---|---|
| `/officer/dashboard` | Officer variant of the dashboard with broadcast/bed/chat action cards |
| `/officer/broadcast` | Compose broadcast alerts (area, severity, message) + hospital bed availability management |
| `/officer/chat` | Two-pane secure chat: conversation list (direct/group/unread filters) + message thread |
| `/officer/access` | Multi-step identity verification: Officer ID + organisation (MOH, SCDF, NEA, Hospital ED) + passphrase → OTP → success → role set to `officer` |

## 3. Architecture

### The data seam (key design decision)
All UI reads go through accessor functions in **`lib/data.ts`** — pages and components never
import `constants/` fixtures directly. This was deliberate: the entire UI was built on mock data
first, then Supabase was swapped in behind the same function signatures without touching pages.
The current version fetches live data from Supabase **with mock fallbacks** when the environment
is not configured.

### State management (React context providers, `components/providers/`)
| Provider | Responsibility |
|---|---|
| `RoleProvider` | Current role, persisted to localStorage (`aidpulse:role`) |
| `ProfileProvider` | User profile from sign-up (name, phone, country code) |
| `CasesProvider` | Citizen-reported cases: seeds from fixtures, persists to localStorage, `addCase()` / `resolveCase()`; the map reads this for live report dots |
| `UpdatesProvider` | News repost state |
| `MessagesProvider` | Chat drafts and conversation state |
| `FriendsProvider`, `MissionsProvider`, `OpportunitiesProvider` | Newer providers for friends panel, volunteer missions, EO-posted opportunities |
| `AIProvider` (`components/ai-assistant/ai-context.tsx`) | AI panel open/close state, message history, `send()` |

### AI assistant pipeline (live)
```
Browser (AI panel) → POST /api/chat (Next.js route, app/api/chat/route.ts)
                   → n8n webhook (N8N_WEBHOOK_URL env var)
                   → n8n workflow: Webhook → LangChain AI Agent → Google Gemini Flash
                                            ↑ Simple Memory (per-session buffer window)
                   → Respond to Webhook → extractReply() → back to the browser
```
- The Next.js proxy exists to avoid CORS, keep the webhook URL out of the client bundle, and
  centralise error handling. It logs metadata only (message length, redacted session ID) — never
  message bodies.
- The system prompt (in `n8n/aidpulse-chatbot-workflow.json`) scopes the agent to Singapore
  health guidance, hospital/emergency-service lookup, and safety steps; it instructs the model to
  direct life-threatening situations to **995 (SCDF)** and states it is not a substitute for a
  doctor.
- `extractReply` has a dedicated unit test (`app/api/chat/extract-reply.test.ts`).

### Data ingest pipelines (n8n, documented in `n8n/README.md`)
| Workflow | Schedule | Source | Target table | Feeds |
|---|---|---|---|---|
| `case-clusters-ingest.json` | Every 6 h | data.gov.sg — NEA Dengue Clusters (GeoJSON) | `case_clusters` | Track Cases map dots, area ranking, case-tracking numbers, alert banner |
| `latest-updates-ingest.json` | Every 15 min | WHO + UN News health RSS (with `og:image` extraction for real article photos) | `latest_updates` | Latest Updates feed |
| `news-updates-ingest.json` (legacy) | Hourly | NewsData.io SG health | `news_updates` | Superseded, kept for reference |

Both active workflows upsert with the Supabase **service_role** key (server-side only, never in
the browser), de-dupe on `source_url` / `source_id`, and derive `risk_level` from cluster size
(≥50 critical, ≥10 high, else medium).

### Auth
- Production flow: phone sign-up with **Twilio Verify SMS OTP** via `/api/otp/send` and
  `/api/otp/verify`, with rate limiting (`lib/otp-rate-limit.ts`).
- Demo builds replace this with a fixed demo code — see
  [04-dev-setup-guide.md](04-dev-setup-guide.md).

### Map
- **Leaflet** via `react-leaflet` with CARTO dark tiles (no API key needed).
- Must load with `next/dynamic` + `ssr: false` (`components/map/aid-map.tsx` →
  `map-inner.tsx`); uses `CircleMarker` to avoid Leaflet icon-asset issues.
- Geocoding (forward and reverse) via Nominatim / OpenStreetMap in the report flow.

## 4. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.7 (App Router, Turbopack), React 19, TypeScript 5 |
| Styling | Tailwind CSS v4 (`@theme inline`, dark-only theme), shadcn on `@base-ui/react`, Lucide icons |
| Map | Leaflet 1.9 + react-leaflet 5, CARTO tiles, Nominatim geocoding |
| Backend | Supabase (Postgres, RLS, migrations + seeds in `supabase/`) with mock fallbacks |
| AI | Google Gemini Flash via n8n LangChain agent; n8n cloud for ingest + chat workflows |
| SMS | Twilio Verify (production OTP) |
| Data sources | data.gov.sg (NEA dengue clusters), WHO / UN News RSS |

## 5. Domain model (types/index.d.ts)

Key types: `Role`, `Alert`, `NewsUpdate`, `CaseStats`, `AreaRank`, `Hospital` (30 real SG
hospitals seeded), `CaseMarker` (aggregated), `ActiveCase` (an individual citizen report: type,
location, status, risk level, images, expiry, optional contact), `CaseType`
(dengue/covid/flu/heatstroke/foodborne/other), `ReportTypeId`, `Mission`, `Opportunity`,
`Conversation`, `ChatMessage`.

## 6. Development history (how the ideas evolved)

The project was built in phases against a 43-frame Figma design:

1. **Foundation + three role UIs on mock data** — every page built against the `lib/data.ts`
   seam (this is the state of the old BrainHack snapshot).
2. **Supabase goes live** — citizen dashboard, Track Cases map, and reports wired to real tables
   with migrations, seeds, and PII protection; hardened fetching with mock fallbacks.
3. **AI becomes real** — Gemini chatbot, then the n8n agent pipeline with the full-screen chat
   modal and reply-extractor tests.
4. **Live data pipelines** — NEA dengue clusters, WHO/UN health news with real article photos,
   real "vs yesterday" deltas.
5. **Real auth + hardening** — Twilio SMS OTP (dev bypass removed), 30 SG hospitals, logging and
   report-expiry hardening.
6. **Volunteer/officer growth** — EO-posted opportunities, mission cancellation, capacity slots,
   QR check-in, impact stats.

The architecture bet paid off: every "seam" placed in phase 1 (data accessors, auth signatures,
AI `send()` stub) is exactly where a live integration later landed, without UI rewrites.
