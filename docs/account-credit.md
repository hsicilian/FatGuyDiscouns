# Add account credit â€” local implementation

Owner CRM action for shipping deposits, gift certificates and other credit grants.
Amounts add to the existing general-purpose credit balance; they are not restricted
shipping funds or redeemable gift-certificate codes. Reason/reference is retained
in the existing credits history (visible through the existing payment/credit history).
No payment, order, invoice or billing-cycle records are created by this action.

Required migration: 20261114185245_add_account_credit.sql (applied in production on 2026-11-14 as
20261114192351_add_account_credit; do not reapply).
Adds a private RLS receipt table and service-role-only security-invoker RPC.
Application validates Owner session; database checks passed actor has current Owner
role. No browser role can execute the function or read the receipt table.
The credit history, additive balance increment, receipt and audit insert are atomic.
A stable request UUID guards repeated submissions; a changed payload with the same
UUID fails. A successful UI submission locks its fields until Start another credit.
A network failure must be retried on the same form. Reloading creates a new request,
so check history before re-entering a credit following an uncertain save.

Existing Apply Payment field now says Existing credit to apply. Failed payment
saves return their real error instead of successful calculation previews. Requests
above saved credit fail rather than silently using zero. Weekly billing math is
unchanged. Owner Add account credit is independent of balance-cycle status.

Concurrency limit: new credit additions serialize and increment atomically, but
legacy payment/credit-edit flows still read then replace the balance in separate
requests. Do not simultaneously add credit and apply/edit a payment or existing
credit on the same account; making those older flows atomic is separate work.

Deployment requires separate authorization: preserve image/configuration and
snapshot affected credit/profile/audit structures; apply migration once before web
release. No backfill or automatic credit is included. Keep receipt table/function
on application rollback. Verify deployed role permissions and manually confirm
one authorized credit before wider use. Deployment verification performed no customer credit transaction.

Local tests: node scripts/test-account-credit.cjs and npm run test:billing (11).
Typecheck passed. Production build passed (exit 0). Credit form rendering/duplicate-submission UI checks passed.
