# Dev & Demo Setup Guide

Practical guide to the working copies, ports, demo login, and environment configuration.
State as of **7 July 2026**.

## 1. Working copies on this machine

| Path | What it is | State |
|---|---|---|
| `E:\Republic Polytechnic\Year_2\C240 Data Innovations\C240_Project` | **Active project copy** (this folder) | Current repo + demo-OTP committed locally (`c1d36d1`, see §3) + team docs |
| `E:\c240_project` | Junction (folder alias) → the project copy above | Created because the dev-server launcher can't handle spaces in paths. Same files, not a copy |
| `E:\aidpulse_sg` | Main development repo | Production auth (real Twilio OTP) |
| `E:\BrainHack Final\BrainHack Final\AIdPulse_SG` (alias `E:\brainhack_app`) | Old snapshot, **36 commits behind** (pre-Supabase, pre-n8n, all mock data) | Superseded — avoid confusing it with the current app |

> The remote is `github.com/Leon-a11y-alt/AIdPulse_SG`. The BrainHack snapshot has 1 local
> commit the remote doesn't have (a one-line landing-page tweak) and lacks the 36 newer commits.

## 2. Running the app

From the active copy:

```bash
cd E:\c240_project
npm run dev -- -p 3002
```

Port conventions used so far (dev servers may or may not be running at any time):

| Port | App |
|---|---|
| 3000 | BrainHack (old) copy — stale, avoid |
| 3001 | `E:\aidpulse_sg` (main repo) |
| **3002** | **`E:\c240_project` (active project copy)** — http://localhost:3002 |

Launch configs live in `E:\aidpulse_sg\.claude\launch.json` (`dev`, `brainhack-dev`,
`brainhack-dev-3001`, `c240-dev`).

## 3. Demo OTP (no SMS)

Production auth uses Twilio Verify SMS (`/api/otp/send`, `/api/otp/verify`) — the dev bypass was
deliberately removed from the main repo in commit `f01e28e`.

This project copy carries the demo change as local commit `c1d36d1` ("Disable OTP and convert
auth flow to demo mode") touching `lib/auth.ts` / `app/page.tsx` / `lib/auth.test.ts`:

- No SMS is sent; Twilio calls are removed from the client flow.
- The verify step accepts exactly one code: **`123456`** (`DEMO_OTP` constant).
- The sign-up form tells the user: *"Demo mode: no SMS is sent. Use code 123456 on the next
  screen."*

The old BrainHack copy has the equivalent change (`DEMO_OTP_CODE` in its `lib/auth.ts`).

> ⚠️ **Never push commit `c1d36d1` (demo OTP) to the shared remote or merge it into the main
> repo.** It exists only for demo builds. If the team needs both behaviours in one codebase
> later, gate it behind an env var (e.g. `NEXT_PUBLIC_DEMO_AUTH=1`) instead.

**Demo walkthrough:** enter any valid SG phone number → Sign Up → enter `123456` → profile step
→ permissions → citizen dashboard. Volunteer/officer roles unlock via their registration flows
(officer access accepts the multi-step verification in demo mode).

## 4. Environment variables (live data)

Copy `.env.example` → `.env.local` in the app folder. Without these, the app still runs but
falls back to mock fixtures instead of live Supabase data, and chat returns an error.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Live dashboard data, case clusters, latest updates, reports (anon key is read-mostly; RLS enforced) |
| `N8N_WEBHOOK_URL` | AI chat — the n8n workflow's production webhook URL (server-side only, proxied through `/api/chat`) |
| Twilio vars (`TWILIO_*`) | Real SMS OTP — not needed when using demo-OTP edits |

n8n side: import the workflows from `n8n/`, fill the two `<SUPABASE_SERVICE_ROLE_KEY>`
placeholders (Supabase → Settings → API → service_role — keep it in n8n only, **never** in the
browser app), run once, then Activate. Full instructions in `n8n/README.md`.

## 5. Known quirks

- **Spaces in paths break the preview launcher** — that's what the `E:\brainhack_app` junction
  works around. Prefer space-free folder names for future copies.
- **8.3 short names are disabled on drive E:** — so `dir /x`-style short paths aren't available;
  junctions are the workaround.
- **Multiple stray dev servers** accumulate easily (three were found running at once on
  3000/3001/3002). If a port is "in use", check `node.exe` processes before assuming the app is
  broken: `Get-NetTCPConnection -State Listen -LocalPort <port>`.
- The old BrainHack copy greets with "Welcome to HPONE DEPAR" on the landing page (a local
  commit) — a quick way to recognise you're on the **old** app by accident. The current app says
  "Welcome to AidPulse SG".
