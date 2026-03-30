# Fatguydiscounts

Fatguydiscounts is a claim-based sales platform built as a web-first monorepo. The working web UI and workflows are preserved in place while production auth, persistence, storage, and operational reads/writes run through Supabase Auth, Supabase Postgres, and Supabase Storage.

## Workspace layout

- `apps/web`: Next.js web app for customers and admins
- `apps/mobile`: Expo scaffold kept for a later phase
- `packages/types`: shared TypeScript domain types and action results
- `packages/core`: shared business rules, guards, permissions, and workflow helpers
- `packages/db`: shared seed/demo helpers and future database helpers
- `packages/ui`: shared UI primitives
- `supabase/migrations`: database schema, RLS, and production-hardening migrations
- `scripts/import-local-json-to-supabase.mjs`: one-time importer from the beta JSON files into Supabase
- `scripts/seed-supabase-demo.mjs`: demo/dev seed path using the beta JSON data set

## Production status

Production-backed today when Supabase env vars are configured:

- Supabase Auth signup, login, logout, verification callback, and password reset
- Supabase Postgres reads and writes for products, balances, claims, shipments, notes, notifications, invoices, credits, and events
- server-side admin/customer mutations with role checks
- production-safe product image uploads through Supabase Storage via `POST /api/admin/product-images`
- RLS coverage for customer, admin, and master-admin access patterns through `0005_production_hardening.sql`
- Railway deployment path with health checks and production env documentation

Still intentionally local-only:

- `apps/web/lib/data/local-db-fallback.ts` and `apps/web/lib/auth/local-auth-store.ts` as a development fallback when Supabase env vars are absent
- `apps/web/data/local-db.json` and `apps/web/data/local-auth.json` as source files for local fallback and one-time import
- the reset-local-data admin control, which is hidden automatically when Supabase is active
- the Expo/mobile scaffold, which is not part of the current public launch target

## Working web flows

Preserved in place:

- customer signup
- login/logout
- approval-gated claiming
- product browsing with search/filter/sort
- claiming items
- running balance view
- due date and overdue notice
- invoice/payment history
- shipment requests
- profile editing
- timezone-aware events
- admin approvals
- inventory editing
- claims and invoice adjustments
- payments and credits
- shipment tracking
- CRM notes
- master-admin promotion flow

## Local development

```bash
npm install
npm run dev:web
npm run typecheck
npm run build:web
```

Behavior by environment:

- With Supabase env vars configured, the app uses Supabase Auth, Postgres, and Storage for live reads and writes.
- Without Supabase env vars, the app falls back to the local beta JSON runtime for development and import tooling.
- In deployed production runtime, the app refuses to use the local fallback path.

## Environment variables

Copy `.env.example` to `.env.local`.

Required for production auth/data/storage:

- `NEXT_PUBLIC_SITE_URL`
- `SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PRODUCT_IMAGES_BUCKET`

Railway-specific:

- `RAILWAY_PUBLIC_DOMAIN`

## Supabase setup

1. Create a Supabase project.
2. Run the SQL migrations in order from `supabase/migrations`, including `0005_production_hardening.sql`.
3. Enable email/password auth in Supabase Auth.
4. Configure the site URL and redirect URLs to include:
   - `https://your-domain.com/auth/callback`
   - `http://localhost:3000/auth/callback`
5. Configure password-reset recovery to route back through `/auth/callback?next=/reset-password`.
6. Create or verify the `product-images` storage bucket.
7. Set your web app environment variables from `.env.example`.
8. Import the current beta data if you are migrating an existing demo set.

More detail: `docs/setup-supabase.md`

## Seed and migration scripts

One-time import from the beta JSON runtime:

```bash
npm run import:local-json
```

Demo/dev seed path:

```bash
npm run seed:supabase
```

These scripts expect:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Create a master admin

Fastest path:

1. Sign up the desired owner account through the app or Supabase Auth.
2. Verify the email.
3. Run SQL in Supabase:

```sql
update public.user_roles
set role = 'master_admin', account_state = 'approved', approved_at = now()
where user_id = 'YOUR_AUTH_USER_ID';
```

A master admin can then access financial reports and promote other users to admin.

## Railway deployment

Use Railway for the Next.js app and Supabase for auth/database/storage.

Deployment guide: `docs/deploy/railway-web.md`

## Production checklist

Use `docs/production-checklist.md` before public launch.

## Important validation note

The codebase, migrations, server actions, and production build are ready for public deployment. Live verification that still must happen in your real Supabase/Railway environment is:

- applying the migrations
- confirming real email delivery from Supabase Auth
- confirming real storage bucket permissions
- running the final launch checklist against the live hosted deployment
