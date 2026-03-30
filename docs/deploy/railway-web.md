# Railway Web Deploy

## Services

Use:

- Railway for the Next.js web app
- Supabase for Postgres + Auth + Storage

## Railway settings

Deploy the repo root and run the web workspace.

Recommended build/start:

- Build command: `npm run build:web`
- Start command: `npm run start -w apps/web`

`next start` uses Railway's injected `PORT` automatically, so no custom server wrapper is required.

## Environment variables

Set these in Railway:

- `NEXT_PUBLIC_SITE_URL=https://YOUR_PUBLIC_DOMAIN`
- `SITE_URL=https://YOUR_PUBLIC_DOMAIN`
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `SUPABASE_PRODUCT_IMAGES_BUCKET=product-images`
- `RAILWAY_PUBLIC_DOMAIN=YOUR_PUBLIC_DOMAIN`

## Auth redirects

In Supabase Auth, set:

- site URL: `https://YOUR_PUBLIC_DOMAIN`
- redirect URL: `https://YOUR_PUBLIC_DOMAIN/auth/callback`
- redirect URL: `http://localhost:3000/auth/callback`

Password reset should route back through:

- `https://YOUR_PUBLIC_DOMAIN/auth/callback?next=/reset-password`

## First public deploy sequence

1. Apply the SQL migrations in Supabase.
2. Import beta data with `npm run import:local-json` if you are migrating the current JSON-backed state.
3. Create or promote the owner to `master_admin`.
4. Confirm the `product-images` storage bucket exists.
5. Deploy the web app to Railway.
6. Verify:
   - signup
   - email confirmation
   - login/logout
   - password reset
   - admin approval flow
   - claiming flow
   - shipment request flow
   - admin reporting access
   - product image upload

## Health check

The app exposes:

- `/api/health`

In a healthy production deploy it should return HTTP `200` and report `mode: "supabase"`.
