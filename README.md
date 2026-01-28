# Gym Program

Mobile-first web app for running a gym program in the gym, logging sets as you go, and reviewing history for progressive overload.

The initial program template (Essentials 4x) is imported from an Excel workbook into Supabase and then used to generate workouts.

## Features

### Auth + Invite-only access

- Email/password login
- Invite allowlist enforced by Supabase RLS (users not on the allowlist cannot read templates or write logs)

### Program template

- 12-week program, 4 workouts per week (Upper/Lower/Upper/Lower)
- Per-exercise targets:
  - Warm-up sets
  - Working sets
  - Reps target
  - RPE target
  - Rest target
  - Notes
- Substitution options (up to 2) per exercise
- Embedded video links for:
  - Primary exercise
  - Substitution options

### Workout runner (mobile-first)

- Collapsible exercise cards to keep the page compact on phones
- Chip row for targets (warmups, sets, reps, RPE, rest)
- Video modal (embedded where possible) with "Open in YouTube" fallback
- Rest timer banner:
  - Start rest per exercise
  - Optional auto-start when a set is marked done
- Workout timer:
  - Shows elapsed workout time
  - Pause/resume
  - Persists if you close/reopen the app
  - Logged to `workout_instances.duration_seconds`
- Set logging:
  - Weight / Reps / RPE inputs on one compact row
  - Mark set done
  - Auto-focus next set for faster entry

### History

- History list across all runs of the program
- Workout detail page showing logged exercises and sets
- "Last" bottom sheet during workouts:
  - Shows last session for the selected exercise (exact name match)
  - Includes best set summary and navigation through recent sessions

### Settings (persisted per account)

- Theme preference: system / dark / light
- Default weight unit: kg / lb
- Auto-start rest timer when a set is marked done
- Focus mode (expand one exercise collapses the others)

## Tech stack

- Next.js (App Router) + TypeScript
- Supabase
  - Auth
  - Postgres
  - Row Level Security (RLS)
- Vercel deployment

## Repo layout

- `src/` Next.js app
- `supabase/sql/` SQL files to apply in Supabase
- `scripts/` importer scripts (XLSX -> JSON artifact + DB)
- `DEPLOYMENT.md` deployment notes

## Setup

### 1) Environment variables

Create `.env` (do not commit) with:

```bash
# Public (browser)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=

# Server-only
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Notes:

- The app supports `NEXT_PUBLIC_SUPABASE_ANON_KEY` as an alternative to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` is required for invite-only signup via the server route.

### 2) Apply Supabase SQL

In Supabase SQL editor, apply:

- Core schema + RLS (created earlier in the project)
- RPC functions:
  - `supabase/sql/get_last_exercise_performance.sql`
  - `supabase/sql/get_exercise_history.sql`
- User settings:
  - `supabase/sql/user_settings.sql`
  - `supabase/sql/user_settings_alter.sql`

After applying new functions, reload the schema cache:

- Supabase Dashboard -> Settings -> API -> "Reload schema cache"

### 3) Install + run

```bash
npm install
npm run dev
```

## Importing the program template

The template importer reads an XLSX file and inserts the program template into Supabase.

```bash
npm run import:essentials -- --write-json
npm run import:essentials -- --write-json --push-db
```

Re-import (delete existing template first):

```bash
npm run import:essentials -- --write-json --push-db --force
```

The importer writes a diff-friendly artifact to `artifacts/` (gitignored).

## Deployment

See `DEPLOYMENT.md`.
