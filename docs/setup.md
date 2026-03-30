# Setup notes

## Web

1. Run `npm install` from the repo root.
2. Copy `.env.example` to `.env.local`.
3. Add your Supabase environment variables if you want the live production-backed path locally.
4. Run `npm run dev:web`.
5. Use `/signup` to create a new pending-approval customer account.
6. Use `/login` to sign in with Supabase Auth when env vars are configured.
7. The `Reset Local Data` control only appears when the app is running in local fallback mode without Supabase env vars.

## Mobile

1. Install dependencies from the repo root.
2. Run `npm run dev:mobile`.
3. Expo Router screens are scaffolded for login, dashboard, products, events, and profile.
4. Mobile remains scaffold-only for now.

## Current runtime model

- With Supabase env vars present, the web app uses Supabase Auth and Supabase Postgres for live auth and business data.
- Without Supabase env vars, the app can still fall back to `apps/web/data/local-db.json` and `apps/web/data/local-auth.json` for local-only development.
- The local fallback exists for development and import tooling, not for public deployment.

## Operational expectations

- Claims must decrement inventory immediately.
- Out-of-stock products stay visible and can still send restock requests into the admin notification center.
- New signups must create `pending_approval` customer records and appear in the admin approvals queue.
- Customers can update address and timezone from the account dashboard.
- Signed-in customers see event times in their saved timezone; guests and staff default to Eastern Time.
- Shipment requests require address confirmation and generate admin notifications.
- Paid balance cycles archive into invoice history before a new cycle begins.
- Admins can correct balances through manual items, shipping/adjustment edits, and line-item edits/removals.
- Admin CRM should support customer search/filtering plus internal notes.

## Production direction

For a public launch, use the Supabase-backed path documented in `docs/setup-supabase.md` and the Railway deployment path documented in `docs/deploy/railway-web.md`.
