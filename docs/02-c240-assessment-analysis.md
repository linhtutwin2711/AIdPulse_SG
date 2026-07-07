# C240 Final Assessment — Rubric Analysis for AIdPulse SG

How the project measures against the C240 "AI in Action" FA brief (45% of the module grade),
component by component, with concrete actions to close the gaps.

## Grade structure recap

| Component | Weight | Graded |
|---|---|---|
| 1. Proposal | 10% | **Team** (same grade for all) |
| 2. Design & Build | 40% | **Individual** contributions |
| 3. Promotional Package | 25% | **Individual** |
| 4. Final Report + Slides | 25% | **Team** |

Key dates: team registration 22 May 2026; proposal submitted by 5 Jun 2026 (done). Each member
must also submit a 1–3 paragraph personal statement of contributions, **endorsed by teammates**.

---

## Component 1 — Value-driven proposal (10%, team)

| Rubric asks | AIdPulse status |
|---|---|
| Real-world problem | ✅ Fragmented emergency/health-crisis information in Singapore |
| Defined target audience | ✅ Three concrete roles: citizens, volunteers, emergency officers — each with dedicated flows |
| Why AI is necessary and ethical | ✅ Strong, and *implemented* rather than just claimed (see below) |
| Appropriate module tools | ✅ n8n and Gemini are load-bearing, both on the taught list |

**Ethics evidence already in the codebase** (cite these in the report):
- Chat proxy logs metadata only — never message bodies; session IDs are redacted
  (`app/api/chat/route.ts`).
- The chatbot system prompt directs life-threatening cases to **995 (SCDF)** and states it is
  "not a substitute for a doctor or emergency services" — same pattern as the brief's Mental
  Wellness Companion example (flag distress → route to real services, don't play expert).
- Citizen reports are PII-protected; report contact details are optional.
- Supabase service_role key is confined to n8n server-side; RLS grants anon read-only.

---

## Component 2 — Design & Build (40%, individual) — strongest area

| Rubric criterion | Status | Evidence |
|---|---|---|
| **Prompt design** — clear, modular, effective; state optimisations | ⚠️ Partial | One static system prompt in `n8n/aidpulse-chatbot-workflow.json`. Effective but not modular, and no documented iterations |
| **Agent logic / flow** — reasoning, decision-making, multi-agent | ✅ Good | n8n LangChain Agent + Gemini Flash + per-session memory behind a webhook; three scheduled ingest workflows with transform/dedupe/upsert decision logic |
| **Data retrieval** — selection, cleaning, structuring (e.g. RAG) | ⚠️ Split | Ingest side is excellent (documented source selection rationale, field mappings, dedupe, risk derivation in `n8n/README.md`). **But the chatbot itself is not RAG** — it never retrieves the app's own data |
| **Testing & iteration** | ⚠️ Partial | Real unit tests exist (`extract-reply.test.ts`, `lib/auth.test.ts`); git history shows iteration. Not yet compiled into presentable evidence |
| **Tool integration** | ✅ / ⚠️ | n8n + Gemini (taught) deeply integrated. Next.js, Supabase, Twilio, Leaflet are **not** on the taught list — approval required |
| **Enhancements** (optional) | ✅ | Interactive Leaflet map, dark UI, deep-linked reports, QR check-in |

### Gap actions (priority order)

1. **Make the chatbot RAG** — wire the n8n agent to query the app's own Supabase tables as
   agent tools: nearest hospitals with live bed availability, active dengue clusters near the
   user. This converts the project's best data asset into its best AI feature and directly
   satisfies the retrieval criterion. Small change: the n8n Agent node supports tools natively.
2. **Document prompt engineering** — keep a prompt log (version, change, why, before/after
   sample output). Restructure the system prompt into labelled sections (persona / scope /
   safety rules / formatting) so it reads as "modular" per the rubric.
3. **Get lecturer approval for non-module tools** — Next.js, Supabase, Twilio, Leaflet. The
   brief says approval must be sought *first*; do this immediately rather than at grading. If
   the team used GitHub Copilot or similar AI coding tools, cite it — Copilot is on the taught
   list.
4. **Compile testing evidence** — a prompt-regression table (input → expected → actual per
   prompt version), the existing unit tests, and manual test passes per feature.

---

## Component 3 — Promotional Package (25%, individual)

The brief requires **at least two** of: explainer video, branded visual identity, short-form
marketing campaign, one-page brochure/elevator pitch, interactive demo experience.

| Artifact | Status |
|---|---|
| Branded visual identity | 🟡 Partial — logo and consistent dark theme exist; no assembled brand kit (palette, banners) |
| Interactive demo experience | 🟡 Arguable — the live app with demo OTP is stronger than a "landing page mockup", but should be framed/packaged as a demo experience |
| Explainer video | ❌ Not started |
| Marketing campaign (TikTok/IG mockups) | ❌ Not started |
| One-page brochure / elevator pitch | ❌ Not started |

**Actions:** produce the missing artifacts with **Adobe Express** (taught tool → scores
"integration of taught tools"). Because this component is graded *individually*, every member
should own at least one artifact — see [03-team-work-split.md](03-team-work-split.md). Confirm
with the lecturer how individual promo contributions are assessed.

---

## Component 4 — Final Report + Slides (25%, team)

Required contents and where they'll come from:

| Required | Source |
|---|---|
| Problem definition + target audience | Proposal + [01-app-overview.md](01-app-overview.md) §1 |
| Design rationale and tool choices | [01-app-overview.md](01-app-overview.md) §3–4 (the seam architecture is a strong story) |
| Prompt examples and flow diagrams (incl. n8n flows) | Export screenshots of the three n8n workflows; prompt log from gap action 2 |
| Promotional artefacts | Component 3 outputs |
| Individual reflections (challenges, testing, lessons) | Each member writes their own; testing log feeds this |
| Presentation slides (client-ready) | Built last, from the report |

**Individual statements:** git history is the proof — every member must commit under their own
git identity. Endorsements must be honest ("endorse only what you know to be true").

---

## Summary scorecard

| Rubric area | Grade risk today | After gap actions |
|---|---|---|
| Proposal | Low | Low |
| Prompt design | Medium | Low |
| Agent logic | Low | Low |
| Data retrieval / RAG | Medium | Low |
| Testing & iteration | Medium | Low |
| Tool integration | Medium (approval risk) | Low |
| Promotional package | **High** (mostly missing) | Low–Medium |
| Report + slides | Medium (not started) | Low |

**Bottom line:** the build is ahead of the rubric — the risks are (1) the chatbot not being
grounded in the app's own data, (2) undocumented prompt/testing work, (3) unapproved tools, and
(4) the promotional package barely existing. All four are fixable well before submission.
