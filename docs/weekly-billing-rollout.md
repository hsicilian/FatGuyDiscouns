# Weekly Sunday billing

Billing uses America/New_York, including daylight saving time. Claims from Monday
through Sunday are due that Sunday. Sunday remains due today until Eastern midnight;
on Monday any unpaid amount becomes overdue. The next regular due date is the next
Sunday strictly after today, so on Sunday it shows the following Sunday separately
from today's current due date.

## Existing records

Migration 0025 changes only due_date (and the existing automatic updated_at timestamp)
on active cycles with a stored date on or after the Eastern deployment day. It assigns
the upcoming Sunday, including today when deployed on Sunday. Dates already matching
are untouched. Future dates later than Sunday move earlier; non-overdue weekday dates
move to Sunday. Overdue dates, explicitly overdue cycles, archived cycles, and cycles
linked to archived invoices remain unchanged. Missing dates are flagged by the preview
for separate review; the app retains its creation-date fallback in Eastern Time.

No cycles are merged or deleted. Multiple existing cycles that acquire the same due
date keep their IDs, amounts, line items, payments, credits, invoice links and shipment
links. The existing account summary aggregates them and payments continue to allocate
oldest/overdue first. New claims reuse one active cycle for their weekly due date.
Creation is serialized per customer across the two claim RPCs and the application's
manual-item/shipping cycle helper to avoid duplicate cycle creation.

Full payment still archives the financial cycle and invoice; it does not archive
unshipped line items. Shipment completion retains its existing behavior. No financial
history is rewritten. The authenticated legacy claim function's local role variable
is renamed to avoid colliding with PostgreSQL CURRENT_ROLE; its approval gate remains.

## Deployment

1. Back up the database and briefly pause billing/claim writes for rollout.
2. Run `docs/weekly-billing-preview.sql` in Supabase SQL Editor. Review the exact
   affected cycle IDs and old/new dates, plus any excluded anomalies.
3. Apply `supabase/migrations/0025_weekly_sunday_billing.sql` once, after existing
   migrations through 0024. Use the normal migration tracker or SQL Editor; do not
   repeatedly run this one-time conversion on future dates.
4. Deploy this app version to Render (or the existing Railway host). The migration
   must precede the app because the app now calls `ensure_weekly_balance_cycle`.
   No new environment variable, cron job, or timezone setting is needed.
5. Resume writes and check one customer and its CRM view: current amount/date,
   overdue amount, next regular date, partial payment, and unshipped claims.

No live database migration or hosting deployment was performed during implementation.

## Validation and remaining legacy references

Run `npm run test:billing`, `npm run typecheck`, and `npm run build:web`.
The billing suite uses disposable embedded PostgreSQL (PGlite), existing schema and
claim migrations, and the actual application payment function through a local
PostgREST test adapter. It checks date boundaries/DST, SQL/TypeScript parity for a full
year, record preservation, both claim RPCs, partial/full payments, credits,
overdue-first allocation, and unshipped line items. It is not a live Supabase or
browser end-to-end test.

Implementation validation: all 11 billing checks and workspace typechecks passed.
The billing suite also passed with Node's timezone set to Pacific/Honolulu and the
database timezone set to Pacific/Auckland. The production build passed using
temporary process-only placeholder Supabase values pointing to localhost; a build
without any Supabase environment fails in the existing session configuration guard.
No placeholder was written to an environment file. Build success does not verify
real authentication, hosting, or a live Supabase migration. Git diff whitespace
checks passed using the repository's normal Windows line-ending configuration.

The only old customer-billing `current_date + 14` expressions remain in historical
migrations 0004, 0007, 0008, 0009, and 0010. These files are intentionally immutable;
0025 replaces both affected functions for existing and newly provisioned databases.
No active cadence configuration uses the old anchor or an alternate-Sunday interval.
Other occurrences of 14 are unrelated layout values, identifiers, dates, or amounts.

## Changed files

- `packages/core/src/index.ts`: Sunday date calculations without a fixed anchor.
- `packages/types/src/index.ts`: shared next regular due date field.
- `apps/web/lib/data/supabase-helpers.ts`: shared summaries, Eastern fallback dates,
  fresh empty-cycle dates and serialized cycle-creation RPC.
- `apps/web/lib/data/supabase-reads.ts`: fresh empty balance fallback.
- `apps/web/app/account/page.tsx`: weekly wording and next regular date.
- `apps/web/app/admin/customers/[customerId]/page.tsx`: matching CRM date display.
- `supabase/migrations/0025_weekly_sunday_billing.sql`: database helpers, claim RPCs,
  and one-time active date conversion.
- `scripts/test-weekly-billing.cjs`: isolated date, migration and payment regression tests.
- `package.json` and `package-lock.json`: billing test command and PGlite dev dependency.
- `docs/weekly-billing-preview.sql`: read-only conversion preview.
- `docs/weekly-billing-rollout.md`: deployment and preservation details.
