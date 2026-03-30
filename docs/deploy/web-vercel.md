# Web deployment

## Current deployment target

The active public deployment target is:

- `apps/web` on Railway
- Supabase Auth + Supabase Postgres for auth and live business data

This document is kept only as a lightweight web deployment reference. Use `docs/deploy/railway-web.md` for the real public launch path.

## Build target

- Root install context: repo root
- App runtime target: `apps/web`
- Build command: `npm run build:web`
- The web build script sets `NEXT_IGNORE_INCORRECT_LOCKFILE=1` to bypass a false-positive lockfile patch step in this workspace.

## Required environment variables

- `NEXT_PUBLIC_SITE_URL`
- `SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Deployment checks

1. Run `npm run typecheck`.
2. Run `npm run build:web`.
3. Confirm `/api/health` returns `ok: true` in the deployed environment.
4. Confirm auth callback URLs and password reset links point to the correct public domain.
5. Confirm the admin dashboard is running in `Supabase live` mode, not local fallback mode.
