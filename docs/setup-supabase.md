# Supabase Setup

## Auth

Enable email/password auth in Supabase Auth.

Set these redirect URLs:

- `http://localhost:3000/auth/callback`
- `https://YOUR_PUBLIC_DOMAIN/auth/callback`

Recommended email templates:

- confirmation email: keep the confirmation link pointing to `/auth/callback`
- password reset email: keep the recovery link pointing to `/auth/callback?next=/reset-password`

If you want custom SMTP delivery, configure it in the Supabase dashboard under Auth > SMTP. Those SMTP credentials are configured in Supabase, not as Railway app environment variables.

## Database

Run the SQL files in `supabase/migrations` in order.

Recommended order:

1. `0001_initial_foundation.sql`
2. `0002_schema_blueprint.sql`
3. `0003_rls_policies.sql`
4. `0004_public_launch.sql`
5. `0005_production_hardening.sql`

`0004_public_launch.sql` adds:

- auth-to-profile bootstrap trigger
- archived invoices
- restock requests
- product status trigger
- transactional claim RPC
- extra indexes and constraints for launch
- cached balance-cycle totals used by the live payments and adjustment flow

`0005_production_hardening.sql` adds:

- forced RLS coverage for the user-facing tables
- refined customer/admin/master-admin policy definitions
- `product_images.storage_path`
- `product-images` storage bucket setup and storage policies

## Storage

The production image path uses Supabase Storage.

Bucket:

- default bucket id: `product-images`
- override with `SUPABASE_PRODUCT_IMAGES_BUCKET` if needed

The admin upload endpoint is:

- `POST /api/admin/product-images`

Expected multipart fields:

- `productId`
- `file`
- optional `position`

Deletes can be sent to:

- `DELETE /api/admin/product-images?imageId=...`

## Import beta data

After migrations are applied and the service role key is set:

```bash
npm run import:local-json
```

This imports the beta JSON data from:

- `apps/web/data/local-db.json`
- `apps/web/data/local-auth.json`

## Live cutover status

When these environment variables are present, the web app uses Supabase for live auth, data, and image storage operations:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PRODUCT_IMAGES_BUCKET`

That Supabase-backed path now covers:

- products and inventory
- claims and balance line items
- active balance cycles and archived invoices
- payments and credits
- shipments
- notifications
- customer notes
- events
- account approvals and admin promotion
- customer profile updates
- product image uploads and product image persistence

If those env vars are absent, the local beta fallback still exists for development only.

## Master admin bootstrap

After the owner account exists in `auth.users`, promote it with SQL:

```sql
update public.user_roles
set role = 'master_admin', account_state = 'approved', approved_at = now()
where user_id = 'YOUR_AUTH_USER_ID';
```

## Local development env vars

Set these in `.env.local`:

- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- `SITE_URL=http://localhost:3000`
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `SUPABASE_PRODUCT_IMAGES_BUCKET=product-images`
