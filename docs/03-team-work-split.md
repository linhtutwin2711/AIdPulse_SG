# Team Work Split — 5 People

Division of work for the AIdPulse SG team for the C240 Final Assessment. Designed around one
constraint: **40% of the grade is individual build contributions judged on AI work** (prompt
design, agent logic, retrieval, testing, tool integration) and **25% is individual promotional
artifacts** — so nobody can be promo-only or UI-only.

## Two protection principles

1. **Nobody is promo-only or UI-only.** The promo lead gets one self-contained AI build task;
   each role owner builds the AI feature that lives in their role. This protects everyone's 40%.
2. **The backend owner enables, but does not author, the role owners' AI features.** Otherwise
   one person holds all the AI evidence and three personal statements ring hollow. Plumbing
   commits belong to the backend owner; feature commits and prompt logs belong to role owners.

## The split

| Person | Build (40% individual) | Promo (25% individual) | Team duties |
|---|---|---|---|
| **Team leader** | **Officer role** + its AI: Gemini-drafted broadcast messages (tone/length/severity constraints — a strong prompt-engineering showcase, can include multilingual variants for SG), AI summarisation of incoming citizen reports on the officer dashboard | Co-lead: one major artifact (e.g. product explainer video) + final package assembly | Coordination, lecturer liaison (tool approvals!), final review pass on report + slides |
| **Promo lead** | One scoped AI task so the 40% isn't empty: e.g. a new n8n ingest source (flu monitoring or haze/PSI from data.gov.sg) **or** the AI report-triage prompt | Co-lead: brand kit (logo, palette, banners), marketing campaign, brochure — the bulk of the package (Adobe Express) | Slide deck design |
| **Citizen owner** | Citizen screens + one AI feature: smart report classification (Gemini turns free-text/photo reports into structured case type + severity) **or** chatbot UX with documented prompt iterations | One small artifact | **Testing & iteration log** — collects everyone's test evidence for the report |
| **Volunteer owner** | Volunteer screens + one AI feature: opportunity-matching flow in n8n (rank opportunities per volunteer by skills, certificates, distance, urgency, with an LLM-generated "why this matches you" blurb) | One small artifact | Report writing lead (compiles all sections) |
| **Backend owner** | Supabase schema/RLS, Twilio, n8n hosting + the **chatbot RAG upgrade** (agent tools that query hospitals/case_clusters); supports role owners' AI features without building them | One small artifact | n8n flow diagrams + architecture section of the report |

## Why this shape

- **Every person can point at AI work** in their endorsed personal statement — nobody is "the
  person who did CSS."
- **The three app roles each have an owner** (citizen / volunteer / officer-leader), but each
  owner ships an AI feature, not just screens.
- **Each rubric criterion has a clear owner:**
  - Prompt design → leader (broadcast drafting) + citizen owner (report classification)
  - Agent logic → backend owner (RAG agent) + volunteer owner (matching flow)
  - Data retrieval → backend owner (RAG) + promo lead (new ingest source)
  - Testing & iteration → citizen owner (aggregates), everyone contributes logs
  - Tool integration → everyone via n8n + Gemini
- **Promo artifacts don't collide** — five people, five different artifact types, all on the
  rubric's list.

## Known risk: testing has no dedicated person

With 5 people, the explicitly-graded testing-and-iteration criterion is owned part-time by the
citizen owner. Mitigation — a standing habit, not a phase:

> Every AI feature owner keeps a running **prompt/test log while building**:
> input → expected → actual, and what changed between prompt versions.

If that discipline holds, the citizen owner aggregates rather than reconstructs.

## Non-negotiable working rules

1. **Commit under your own git identity, on feature branches.** The git log is the evidence
   backing the endorsed personal statements (and the 40% individual grade).
2. **Keep a prompt/test log as you build** — one markdown file per feature is enough.
3. **Don't merge demo bypasses into the production repo** (see
   [04-dev-setup-guide.md](04-dev-setup-guide.md) — demo OTP lives only in demo copies).
4. **Ask the lecturer before adopting any tool not on the taught list** (taught: Ollama, GitHub
   Copilot, Gemini, Google AI Studio, NotebookLM, Botpress, n8n, Adobe Express). Already used
   and needing approval: Next.js, Supabase, Twilio, Leaflet.

## Report & slides ownership (25% team)

No dedicated owner — split across everyone:

| Piece | Owner |
|---|---|
| Compile + edit the report | Volunteer owner |
| Slide deck design | Promo lead |
| Testing evidence section | Citizen owner |
| n8n flow diagrams + architecture | Backend owner |
| Final review + submission | Team leader |
| Individual reflections + personal statements | Each member |
