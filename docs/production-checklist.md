# Production Checklist

## Backend

- Create the Supabase project
- Apply all SQL migrations in `supabase/migrations`, including `0005_production_hardening.sql`
- Enable email/password auth
- Configure auth callback URLs
- Promote the owner account to `master_admin`
- Confirm RLS is enabled and forced on the user-facing tables
- Confirm the `product-images` storage bucket exists

## Email auth

- Confirm signup verification email is delivered
- Confirm password reset email is delivered
- Confirm `/auth/callback` exchanges the session successfully
- Confirm `/reset-password` updates the password successfully
- If using custom SMTP, configure it in Supabase Auth > SMTP and send a real test email

## Data and storage

- Run `npm run import:local-json` for the beta data if needed
- Verify products, customers, notes, shipments, invoices, restock requests, and events imported as expected
- Verify active balance cycles, shipping totals, adjustments, payments, and credits imported correctly
- Confirm product image uploads write to Supabase Storage and create matching `product_images` rows
- Confirm the app is running with Supabase env vars so live reads and writes no longer depend on local JSON

## Web app and Railway

- Set all Railway environment variables
- Deploy the web app on Railway
- Confirm `/api/health` returns HTTP 200 and `mode: "supabase"`
- Confirm `npm run start -w apps/web` is the production start command
- Confirm Railway injects `PORT` and the app starts normally without custom port code

## Security and access control

- Only approved customers can claim
- Banned and claiming-disabled users are blocked correctly
- Admins can approve, disable, and ban customers
- Only master admin can access reports and promote admins
- Customer pages only show the signed-in customer’s balances, claims, shipments, invoices, and profile data
- Customer notes and notifications are not publicly readable
- No production runtime path falls back to `local-db.json` or `local-auth.json`

## Business-rule validation

- Inventory reduces correctly on claims
- Out-of-stock items stay visible and can create restock requests
- Shipment request still requires address confirmation
- Event times render in customer timezone when available
- Payments archive paid cycles and create a fresh active cycle
- Overpayments become credit and credits apply correctly
- Inventory cannot go below zero even under repeated claim attempts

## Final manual QA

- Guest storefront browse/search/filter/sort
- Customer signup -> verify -> login
- Admin approval -> customer claim
- Balance update and overdue display
- Shipment request -> admin tracking update
- Payment application and archive flow
- CRM notes and customer filtering
- Reports visible only to master admin
- Product image upload and storage persistence

## Remaining non-production-only pieces

These are intentionally not on the public production path:

- local JSON fallback files for offline/dev mode
- local auth fallback files for offline/dev mode
- admin reset-local-data control, which is hidden automatically when Supabase is active
- mobile app scaffold
