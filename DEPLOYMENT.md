# Deployment (Vercel + Supabase)

This app is a Next.js project designed to deploy on Vercel and use Supabase for auth + Postgres.

## Prereqs

- A Supabase project is already created and has the SQL schema applied.
- Vercel account
- Node 20+ locally (recommended: `nvm use 20.19.0`)

## Environment variables

Set these env vars in Vercel (Project -> Settings -> Environment Variables):

Public (safe to expose to browser):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (or use `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

Server-only (DO NOT expose to the browser):

- `SUPABASE_URL` (same as `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`

## Deploy via Vercel CLI

From the repo root:

```bash
# ensure node is compatible with vercel cli
source ~/.nvm/nvm.sh && nvm use 20.19.0

npx vercel
```

Follow prompts:

- Scope: your Vercel account
- Project name: e.g. `gym-program`
- Framework: Next.js (auto-detected)

Then set env vars in Vercel (dashboard) and deploy production:

```bash
npx vercel --prod
```

## Deploy via Git (optional)

If you connect a GitHub repo in Vercel, Vercel will deploy on every push.
