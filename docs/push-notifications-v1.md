# FGD Push Notifications V1

## Deployed correction: sale announcements without a destination

The Owner sale composer now requires only a title and message. Use the message
to announce when and where a Facebook group sale, Whatnot show, Twitch stream,
or other sale takes place. The destination field and `/store` default are removed;
no optional external-link field is added in this narrow correction.
Preview explicitly identifies link-free announcements. Tapping one dismisses it
without opening a page. Existing approved internal links in old drafts remain
valid. Payment reminders still open `/account` and otherwise remain unchanged.

Local checks: all 19 push checks and type-checking pass, including link-free sale
preview/simulated delivery, absent/null/empty destination handling, no-navigation
clicks, rejection of unsafe destinations, and unchanged payment-reminder clicks.
Deployed as `fgd-web:push-sale-20261022` after a successful production Docker build.
Previous image retained as `fgd-web:pre-sale-fix-rollback`. Runtime configuration
is unchanged and sending remains disabled. No actual sends were performed.
The public worker exactly matches the release and serves with `max-age=0`;
physical-phone activation still needs verification. Fresh signed-in browser checks
were unavailable because browser access was disabled in Work settings.

Before any separately approved delivery test, verify the updated service worker
has activated on the test device after deployment. An older installed worker can
still use its old `/account` fallback for an empty destination. Reload/reopen FGD
and complete worker activation before testing tap behavior. Sending stays disabled.

## Customer interface revision — October 22, 2026

The mobile-first customer revision was deployed on October 22, 2026 as
`fgd-web:push-mobile-ui-20261022`, with `fgd-web:pre-mobile-ui-rollback`
retained. Sending remains disabled and runtime configuration is unchanged.
Public health/storefront/login, signed-in customer account/billing summary, and
390px notification layout checks passed. Office and Scheduler stayed healthy.
In-app notification permission remained pending, so live enrollment/persistence
awaits Android testing; the local independent-autosave tests passed. Owner source
is unchanged; a fresh authenticated Owner walkthrough was not performed.
The development and deployment instructions below are retained for reference.

- **Get FGD Notifications on Your Phone** introduces two large switches: Sale
  announcements and Payment reminders. Each saves automatically. Turning a choice
  on requests permission and registers this phone in the same interaction; there
  is no separate primary registration or save button. Permission alone does not
  opt into either category. Failed permission/save attempts leave choices unchanged.
- Expandable, device-specific Home Screen instructions encourage Android installation
  without requiring it. iPhone/iPad users must open the installed Home Screen app.
- More notification options contains per-phone activation/deactivation (including
  enabling saved choices on a second phone) and account-wide unsubscribe. Turning
  a category off still works when permission is blocked. Account-wide choices
  remain independent. Owner controls, dispatch, billing, schema and APIs are unchanged.
- Focused handler tests cover autosave, independent preferences, reloads, permission
  denial/dismissal, unsupported browsers, iPhone installation, failed saves, and
  active-device reconciliation. The 19 existing push checks also pass.
- The real React component was exercised in a local interactive fixture at 390px
  width: both switches, independent on/off changes and reload persistence. Switch
  targets measure 52 x 44px; no horizontal overflow. Browser permission and push
  APIs were mocked, so this does not replace physical-phone testing.

Deployment completed under separate approval. Retain the previous image for rollback
and keep `PUSH_SEND_ENABLED=false`; no migration or VAPID rotation is needed.
To test enrollment, sign into a customer account on Android Chrome, open
Notifications and turn on a category, then tap Allow if asked. Check the other
category stays off and reload to verify persistence. Optionally install from the
Chrome menu. On iPhone/iPad 16.4+, use Safari > Share > Add to Home Screen, open
that icon, sign in and turn on a category. Also verify turning off, second-phone
registration, signing out, and account-wide unsubscribe. Owner test-device
registration remains on `/admin/push`. Registration sends no notification.
Actual device delivery requires separate approval; sending remains disabled.

Physical phone permission prompts, provider registration and live persistence for
this revised UI remain unverified. Only the FGD application image was updated;
notification sending remains disabled.

Installation references: [Chrome](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid),
[Safari](https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios).

## Original implementation record

Development implementation only. No migration has been applied to Supabase, no
deployment performed, no VAPID credentials generated, and no real notifications
sent during development. Both switches default to off.

## Customer and owner experience

- Customer account page: separate **Sale Announcements** and **Invoice & Payment
  Reminders** choices, both off initially. Browser permission/device registration
  does not select either category. Choices apply to all devices on that account.
- Explicit enable-device button, disable-current-device, and turn-off-all controls.
  Up to 10 active subscriptions per account, with multiple browser/device support.
- Owner (`master_admin`, non-banned) opens `/admin/push` from notification history
  or the payment ledger. Ordinary admins cannot preview, test, confirm or dispatch.
- Compose sale title/body and choose an allowlisted FGD route. Invoice wording is
  fixed, generic, and opens the existing authenticated `/account` page.
- Preview displays eligible customers and subscriptions separately. Owner tests
  target only the owner's devices and do not reserve customer billing cycles.
- Check the confirmation box, then confirm. The page drains persisted pending
  deliveries in requests of at most five, while it remains open. Closing the page
  stops progression; use recent-send history to continue after interruptions.
- Retries require manually continuing the confirmed send after provider backoff.
  There are no cron tasks, scheduled sends, automated weekly/overdue campaigns,
  offline caches or third-party paid notification platforms.

## Billing and duplicate safety

`listActiveCycleContexts` is the existing read-only authoritative billing reader.
The push module consumes its calculated `due` value without reimplementing
financial math. A cycle must be active, have a positive balance and a due date on
or before today's Eastern date. Sunday is due today; Monday overdue behavior is
unchanged. The feature does not create cycles, invoices, payments or credits.

Preview stores only a draft message, not its audience. Confirmation rebuilds the
audience; each device delivery rechecks consent, account/subscription status and
the current authoritative balance. This excludes payments made after preview or
while a send is paused. As with any external message, a payment/opt-out concurrent
with the final read and network call cannot recall an already accepted message.
Provider retention is limited to one hour; a device may receive it after payment.

One transaction atomically locks the draft, reserves each customer/cycle via a
unique key, and creates unique send/subscription delivery rows. Overlapping sends
cannot reserve the same cycle. Repeated confirmation uses the same send ID.
One message per device covers all newly reserved due cycles for that customer.
Reservations remain even if all deliveries fail or are skipped: V1 prioritizes
avoiding duplicates and offers no force-resend of a reserved invoice cycle.
Newly subscribed devices do not receive a second reminder for a reserved cycle.

Delivery requests have socket and connection-destruction deadlines and sequential
bounded batches. Explicit 429/503 rejections can retry, at most three attempts,
with exponential delay and any longer Retry-After. 404/410 disables the device.
Network errors/timeouts become `unknown` and are not automatically retried.
`sending` rows older than five minutes become `unknown` on the next batch request.
No system can atomically commit a remote push-service acceptance and a local DB
write; unknown status makes that ambiguity visible without blindly resending.
`accepted` means push provider acceptance, not display/read confirmation.

## Security and lifecycle

- Five new push-only tables have RLS enabled and deny anon/authenticated direct
  access. Server-only handlers use the existing verified Supabase identity and
  audit logger; dispatch requires Owner access. Existing operational notifications
  and customer/billing tables are unchanged.
- Same-origin JSON is required for mutations; request bodies are capped at 8 KiB.
  Explicit confirmation and a draft expiring after 30 minutes gate sending.
- Only approved HTTPS push-provider hostnames are accepted; internal/arbitrary
  destinations, ports and credentials are rejected. Provider redirects are not
  followed by the Web Push library. Click URLs are a small local-route allowlist.
- Subscription endpoints and encryption keys remain server-side, with generic
  errors; delivery records store only status codes, never provider error bodies.
- The current device is disabled on sign-out. Browser subscriptions are removed
  on signed-out visits/account switches; they never transfer silently. Returning
  visits reconcile device state, but never automatically opt in/reactivate.
  Clearing site data can leave a stale server endpoint; 404/410 cleanup handles it.
  Push-storage failure does not block account sign-out. In that case browser
  cleanup is the fallback; if browser cleanup also fails, a generic notification
  may still arrive until the endpoint expires or is disabled. No balance details
  are carried in that notification.
- Persist VAPID secrets privately. No keys are included in source, images or logs.
  The public key is served at runtime by `/api/push` to authenticated clients.

## Configuration (names only; use a private runtime environment)

| Variable | Purpose |
| --- | --- |
| `PUSH_ENABLED` | `true` exposes the feature; otherwise no push-table access/UI |
| `PUSH_SEND_ENABLED` | `true` additionally allows real sends, including owner tests |
| `VAPID_PUBLIC_KEY` | Persistent public application-server key, runtime only |
| `VAPID_PRIVATE_KEY` | Persistent secret, runtime only |
| `VAPID_SUBJECT` | Owner contact `mailto:` URI or valid HTTPS contact URI |
| `SITE_URL` | Canonical public origin for same-origin checks; existing setting |

No production or local secret file was changed. If using an explicit Compose
environment allowlist, add these runtime variables during separately approved
deployment. Do not rotate the VAPID pair casually: existing device subscriptions
are bound to its public key.

## Local validation

`npm run test:push`: synthetic in-memory PostgreSQL, the actual additive migration,
production push service code and a fake transport. Tests never read secret env
files or use production services. `npm run test:billing` verifies the existing
weekly billing regression suite unchanged. Also run web typecheck/build.

Final validation: 19 push checks pass, including HTTP authorization/CSRF/body
limits, rendered customer/owner controls, device ownership/opt-out, browser
account-switch cleanup and retry, and sign-out during push-storage failure.
Web TypeScript checking and the final optimized Next.js build pass. The build
used placeholder configuration with both push switches off. The 11 previously passed weekly-billing tests
remain valid: no billing source, billing migration or billing test was changed
in the resumed validation work. The local PGlite tests exercise the SQL and
duplicate constraints but are not a multi-connection production load test.

The migration file is `supabase/migrations/0026_web_push_v1.sql`. Do not blindly
apply all local migrations: preserve the separately completed weekly-billing
migration and verify the live migration ledger before applying only this addition.

## Separate approval gates before release

1. Review this code and the additive migration; approve controlled deployment and
   applying that migration. Back up existing infrastructure configuration.
2. Generate one persistent VAPID pair into a private runtime secret store (never
   terminal/chat output), set a valid contact, and retain it for subsequent releases.
3. Apply the reviewed migration, deploy the reviewed FGD image with
   `PUSH_ENABLED=true`, `PUSH_SEND_ENABLED=false`. Validate authentication, RLS,
   origin handling behind Caddy, preferences, device ownership and previews.
   Verify service-role access and anon/authenticated denial for all five tables
   and both RPCs using the actual Data API. The migration explicitly grants the
   service role access rather than relying on default grants. Run the database
   security advisors in that approved environment and inspect only new findings.
4. With separate permission for real **owner-device tests**, enable sending and
   run Android and installed iPhone tests. Confirm locked/closed-app delivery,
   correct account destination, both categories independently, device opt-out,
   logout/account switching, multiple devices and duplicate submission behavior.
5. Separately approve a small customer pilot before sending to actual customers.
   Validate real due-balance previews against the existing billing UI on Sunday.
   Retain Render until the migration rollback policy allows retirement; this work
   does not change Render, Contabo, Caddy, DNS, Supabase billing or other apps.

Rollback: turn both flags off and deploy the previously approved image if needed.
Retain push tables and VAPID credentials; do not drop tables or erase delivery
reservations to reset sends. Feature rollback requires no billing-data rollback.

### Device acceptance checklist (after separate send approval)

| Check | Expected result |
| --- | --- |
| Android and installed iPhone, screen locked/app closed | Owner-test notification arrives; results show provider acceptance |
| Tap sale notification | Dismisses the title/message announcement without opening an unrelated page |
| Tap payment reminder while signed out | Requires login before showing the account balance; lock screen contains no amount/name |
| Save neither, sales only, invoices only, both | Customer eligibility follows each category independently |
| Register two devices | Preview shows one eligible customer and two subscriptions |
| Disable one device, then disable all | Disabled subscriptions receive no subsequent sends; choices persist as documented |
| Sign out, then sign in to another account | Old browser subscription is removed; new account requires explicit enablement |
| Deny/revoke browser permission | UI does not claim active permission; enabling requires browser settings where applicable |
| Confirm twice or resume a send | No second delivery for the same send/subscription; no second invoice reservation for the cycle |
| Close send page and reopen history | Pending work can resume; uncertain requests are not automatically repeated |

Use synthetic billing fixtures locally for paid-after-preview and Sunday/Monday
boundary tests. Do not alter live customer balances to conduct phone testing.
Owner-test mode bypasses customer consent/billing solely to target the owner's
devices; it does not prove real customer billing eligibility. Validate actual
customer previews read-only before any separately approved customer pilot.

Physical-device delivery, live RLS/network behavior and real Supabase push
integration remain unverified until the approved deployment/pilot. Browser support
is capability-detected. iPhone/iPad Web Push requires a Home Screen web app on
iOS/iPadOS 16.4+; device/OS permission settings can still prevent delivery.

References: [Web Push library](https://github.com/web-push-libs/web-push),
[Apple Web Push guidance](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).

### Individual customer targeting (local implementation; separate deployment approval required)

On `/admin/push`, Recipients defaults to All subscribed customers. Choose Specific
customer, search by CRM name or email, and select one account. Preview displays
the server-resolved name, email, account ID, and eligible customer/device counts.
Changing the recipient or category clears the preview and confirmation. Zero
eligible devices disables sending. The same choices apply to both categories.

New previews require an explicit recipient object. The private `push_sends.message`
JSON stores `recipient: { mode: "all" }` or `{ mode: "customer", customerId }`.
No migration is required. The customer ID is bound to the saved preview; confirmation
does not accept a replacement audience. Confirmation rechecks the customer and
rebuilds eligible devices; every dispatch/retry checks the saved target, role,
consent, subscription, and existing billing eligibility. Recipient metadata is
not included in the phone payload. Legacy stored sends without recipient metadata
retain their prior broadcast/Owner-test meaning; malformed metadata fails closed.

Search is Owner-only, read-only, paginated and bounded to the existing V1 capacity;
it returns at most 20 matches and asks the Owner to refine larger result sets.
It reads CRM display names and Auth email addresses without loading billing data.

Deployment must update the server and dashboard together. An already-open old
dashboard must be refreshed because new previews require explicit recipients.
Before rolling back to code that predates targeting, disable sending and keep it
disabled until all individual drafts have expired (30 minutes) and pending/retry
individual sends have been reviewed. Old code does not understand the target
metadata. Do not delete delivery records or cycle reservations to facilitate rollback.
Production deployment and any real notification test require separate approval.

### Persistent customer inbox (local development; not deployed)

Customer navigation now includes `/account/notifications`. Entries are displayed
newest first, 50 per page, with title, message, Eastern timestamp, and Delete.
The page and its authenticated API work independently of phone permission,
preferences, and the push feature flag. Deletion persists across sessions/devices;
refreshing an already-open page retrieves current state. No archive, read status,
automatic expiry, or realtime subscription is introduced.

The Owner's default audience label is now **All customers**. Preview separates
in-app recipient count from opted-in phone-push customer and device counts.
One eligible customer can receive an inbox entry even with zero phone devices.
Specific-customer selection and explicit confirmation still apply. Owner test
mode remains phone-only and does not populate customer inboxes.

Required additive migration: `20261023053444_customer_notification_inbox.sql`.
It adds `customer_notifications` with a unique `(send_id, customer_id)` key,
ownership RLS, explicit grants, and a visible-inbox index. Customer deletion sets
`deleted_at`; that tombstone prevents resurrection from retries, while preserving
the separate administrative send, audit, delivery, and reminder-cycle records.
Browser roles can only read their own visible entries. Deletion is performed by
the same-origin customer API with ownership derived from the authenticated session.

The new service-role-only, security-invoker `push_confirm_inbox` transaction
creates inbox entries, reserves eligible invoice cycles, and queues consented
phone devices together. Failure rolls back all three. Billing eligibility is
recalculated using existing authoritative functions immediately before confirmation;
phone dispatch keeps its existing per-device eligibility check. In-app history
persists even when push fails or the customer subsequently pays. Reminder cycles
are reserved for an in-app-only reminder too, preventing repeat reminders for the
same cycle. No billing function, balance calculation, or payment record is changed.

Existing internal `notifications` and customer/admin message threads remain
separate. There is no historical backfill: pre-inbox previews and queued sends use
the original pipeline. Newly created non-test previews carry `message.inApp=true`
and use the new transaction; all future customer sends through this workflow
create the appropriate inbox records without requiring phone consent.

For controlled deployment, apply this migration before deploying the app, refresh
the Owner dashboard and create a new preview. Verify customer ownership/deletion
with authorized accounts and compare in-app versus phone counts without confirming
any real send until separately approved. Preserve the prior image and keep all new
tables/data on application rollback. Disable sending before rollback to older code
if inbox-enabled or individually targeted drafts/pending sends exist; older code
does not implement the new recipient semantics. Never delete delivery/cycle records
to reset notifications. No production migration, deployment or delivery was run
during development.

Final local validation completed October 23, 2026: all 30 push/inbox checks,
customer/Owner/inbox UI interaction tests, and workspace type-checking passed.
The production build completed with exit code 0 and included both
`/account/notifications` and `/api/account/notifications`. It used placeholder
configuration with sending disabled; no real notification transport was used.
The migration was exercised in the local in-memory PostgreSQL suite, including
ownership RLS, restricted grants, atomic confirmation, persistent deletion,
pagination, invoice deduplication, and preservation of inbox entries after push
failure. These results were retained on resume rather than rerunning completed
checks. Ready for a separately authorized migration and application deployment;
live authenticated and physical-device acceptance checks remain post-deployment.

### Delivery selection and General Updates (local; not deployed)

The Owner composer defaults to **In-app only**. **In-app + Phone Push** is an
explicit choice for Sale Announcements or Payment Reminders. General Updates
accept a title/message and lock delivery to In-app only; returning to another
category does not turn phone push back on. Changing delivery clears preview and
confirmation. Owner phone tests are disabled while In-app only is selected.
The recipient choices remain All customers and Specific customer.

New previews require `delivery: "in_app_only" | "in_app_push"`, saved in private
`push_sends.message` metadata. Confirmation and dispatch use that saved choice,
not a replacement submitted by the browser. Invalid or null metadata fails
closed. Existing records with no delivery field retain their original push
behavior; General Updates cannot use that legacy fallback.

In-app-only selection does not query push subscriptions or require category
consent. Preview reports zero phone customers/devices. Confirmation creates inbox
records and reserves eligible invoice cycles atomically without any push jobs.
Dispatch returns results without claiming or retrying work or invoking transport.
The existing global manual-send enable flags still apply. VAPID configuration is
required only when phone push is selected. No new customer preference is added.

Required local migration: `20261023174058_notification_delivery_modes.sql`, after
the customer inbox migration. It expands only the two notification category
constraints to allow `general`, updates the inbox confirmation function, and adds
a push-delivery insertion guard for inbox-only/general sends. No customer,
preference, subscription, billing, or existing message data is rewritten.
Reminder-cycle reservations are shared across both modes: sending an inbox-only
reminder does not permit another reminder for that cycle via phone push later.
Customer deletion, audit retention, retry rules, and notification click behavior
remain unchanged.

Apply the migration before deploying this revision, then refresh the Owner page.
Do not roll back to an application that ignores delivery metadata with sending
enabled while inbox-only/general drafts or pending work exist. Keep the schema
and queue guard on rollback; never remove inbox or delivery records. Production
migration, deployment, and real delivery require separate approval.

### Session-independent device enrollment (local, not deployed; October 24, 2026)

This section supersedes earlier logout/device-removal instructions. Logout now
signs out only the current Supabase session and preserves the installation cookie,
server subscription and saved category preferences. Signed-out or uncertain Auth
results and missing local account markers never trigger browser unsubscription.
Dispatch eligibility is based on the associated customer, saved consent, active
subscription and billing eligibility, not an active login session. Protected
notification destinations still require authentication; reminder content stays generic.

Demonstrated session defects: the previous middleware matcher skipped Home,
Store and Events even though the root layout reads Auth. A refresh during server
render could not persist rotated cookies. Middleware now covers page/API routes
while excluding static assets and the service worker. The prior signOut() default
was global; explicit logout now uses scope local. Transient Auth errors produce
an unavailable-verification error rather than being interpreted as signed out.
These defects are established in source/tests; neither proves which event signed
out either phone on October 24. No production Auth configuration was changed.

Authenticated reconciliation uses the existing HttpOnly installation cookie and,
when supplied, endpoint plus encryption-key possession. A confirmed different
account disables the prior server association before replacement. Subscription
ownership is never reassigned in place. Password login checks the installation
before redirect; the browser boundary also handles session/account transitions.
Missing localStorage markers alone have no authority to unsubscribe. Errors fail
closed and do not remove browser enrollment. No new schema or migration is needed.

An active same-account server registration with a lost browser subscription may
be restored with already-granted permission and saved consent. Inactive records
can represent an explicit opt-out or a provider rejection; they are NOT silently
reactivated. Explicit 'Enable saved choices on this phone' replaces an inactive
browser endpoint where necessary, then registers the new endpoint without changing
preferences. Browser permission/install restrictions still require user action.
An attention warning is outside the collapsed Phone Notification Settings section;
it distinguishes unavailable status from a known need for recovery. Registration
is never represented as proof of physical notification delivery.

Owner previews retain current active eligible registration counts. Historical
results retain delivery records and now explicitly show devices attempted alongside
accepted/expired/failed/etc. status counts, even after registrations are disabled.

After separately approved deployment, each test phone should reopen FGD, sign in
to Michelle's account, and follow the visible attention warning. Expand Phone
Notification Settings > More notification options > Enable saved choices on this
phone. Existing sale/payment preferences are retained. Do not toggle categories,
reinstall the app or regenerate VAPID keys. Check active registration counts through
a preview; an actual notification test requires separate approval. Logout should
leave registration active. Verify this on both phones and verify account switching
on an authorized shared-device test before general rollout.

Validation is entirely local: in-memory database and mocked provider/Auth/browser.
No production endpoint, notification or migration is involved in these tests.

Final local validation: 37 push/inbox checks passed, expanded notification UI
interaction tests passed, session/login/refresh mock tests passed, workspace
type-check passed, and final production build exited 0. Historical attempts exclude
skipped, queued and in-progress records; unknown/interrupted outcomes are explicitly
identified as uncertain. No real transport or production data access was used.

Files changed for this correction:
- apps/web/middleware.ts
- apps/web/lib/auth/session.ts
- apps/web/app/actions/session/login.ts
- apps/web/app/actions/session/logout.ts
- apps/web/lib/push/server.ts
- apps/web/app/api/push/route.ts
- apps/web/components/push/browser-account.ts
- apps/web/components/push/push-account-boundary.tsx
- apps/web/components/push/notification-settings.tsx
- apps/web/components/push/admin-push.tsx
- apps/web/app/account/page.tsx
- scripts/test-push.cjs
- scripts/test-push-ui.cjs
- scripts/test-session-push.cjs (new)
- docs/push-notifications-v1.md

Unrelated existing working-tree changes were preserved. A later deployment must
package only this approved correction on top of the current production context.

### Phone status redesign and failure alerts (local only; October 24, 2026)

This supersedes earlier category-switch-first UI. A single compact status panel
renders after the financial summary and before claims/shipping, using a portal
from the one existing settings component. Checking is neutral. ON means current
registration plus granted browser permission, not receipt. OFF shows one direct
Turn on phone notifications action. Blocked, unsupported, iPhone installation and
verification-error states are distinct. No category checkboxes appear for an OFF
phone. Existing preferences are never enabled by registering. First-time customers
register, then choose categories explicitly. Installation help, account-wide category
editing and device/account opt-out controls remain collapsed at the page bottom.
No logout, account-switching, session or service-worker behavior was changed here.

Required local migration: 20261024200056_push_failure_alerts.sql. Explanation:
the existing inbox unique(send_id,customer_id) cannot hold both a sent message and
a failure warning. A new kind discriminator preserves existing message rows and
changes uniqueness to (send_id,customer_id,kind). No content is rewritten and no
historical failures are backfilled. New internal alert/event tables provide durable
aggregation and lifecycle history. Existing customer ownership RLS
and deleted_at tombstones remain. Browser roles cannot access alert/event tables
or call the internal functions. The trigger-only security-definer function reads
Auth email for the admin alert; its search_path is fixed and execution is revoked
from PUBLIC/anon/authenticated. Source delivery writes already require service role.
Apply this migration before a separately approved application deployment. Retain
schema/data on rollback; older code can still confirm messages but does not expose
new recovery links or internal failure-alert details.

An active registration's first 404/410 outcome atomically marks it inactive and
creates/updates one customer inbox warning and one separate administrative warning
per customer/send. This adds no phone-push jobs and does not modify preferences.
Warnings describe remaining active registrations at the failure time. No active
registrations means the account currently has no phone notification availability.
A later failure in the same send updates the warning without clearing deleted_at.
Customer warnings link to /account#phone-notification-status. Owner history at
/admin/notifications includes customer name/email, failed count, active remainder,
UTC time, HTTP status and a customer-record link. These administrative alerts use
the existing admin access model. Customer inbox messages contain no private
provider endpoints, keys, account balances or tokens.

401/403 creates a system-configuration alert grouped once per send, not a customer
unsubscribe warning. Subscriptions remain active. Existing 429/503 backoff and
ambiguous network/timeout reporting are retained. Provider acceptance remains
accepted, never proof of display. Invalid/configuration events are unique per
delivery. Known-inactive subscriptions do not create new alerts. Reactivating an
existing row records recovered; a new endpoint records registered. These events
preserve chronology but do not invent physical-device identity or correlate two
different endpoints without evidence. A later send after recovery can warn again.

Owner alerts are INTERNAL ONLY. The push failure workflow never imports or calls
the email helper and creates no SMTP/email queue, claim function or delivery state.
Customer name and email remain in the internal administrative alert as identifying
information for follow-up; they are not used to send an email. Send Notifications
links to internal notification history and the affected customer record. Existing
SMTP configuration, account emails and password-reset behavior are untouched.

The unapplied migration was revised in place to remove email-only columns and the
email-claim function. It is still required for durable customer/Owner alerts,
subscription-event history and duplicate suppression. Apply this exact revised
file once before the corresponding application release, only after authorization.
There is no backfill and no external notification delivery in the migration.

Changed files for this task:
- apps/web/app/account/page.tsx
- apps/web/app/admin/notifications/page.tsx
- apps/web/components/push/notification-settings.tsx
- apps/web/components/push/admin-push.tsx
- apps/web/components/push/inbox-list.tsx
- apps/web/lib/data/supabase-reads.ts (notification mapping only; unrelated work preserved)
- apps/web/lib/push/server.ts
- apps/web/lib/push/inbox.ts
- packages/types/src/index.ts (admin notification type/link only; unrelated work preserved)
- scripts/test-push.cjs
- scripts/test-push-ui.cjs
- supabase/migrations/20261024200056_push_failure_alerts.sql (new, unapplied)
- docs/push-notifications-v1.md

Final validation for this local change: 43 push/inbox checks passed, redesigned
customer/Owner/inbox UI interaction checks passed, session/logout/account-switch
checks passed, workspace type-check passed, and production build exited 0.
In-memory PostgreSQL exercised the migration, atomic invalidation/aggregation,
permissions, deletion tombstones, recovery events and internal alert duplicate suppression.
No physical-phone delivery was tested. No code was deployed and the
migration remains unapplied to production.

Email-removal adjustment files: apps/web/lib/push/server.ts,
apps/web/components/push/admin-push.tsx, scripts/test-push.cjs, this document,
and 20261024200056_push_failure_alerts.sql. The newly added
apps/web/lib/push/failure-alerts.ts was removed; apps/web/lib/admin-email.ts was
restored to its pre-feature implementation. No SMTP settings were touched.

### Inbox click destinations and clickable message links (local; October 25, 2026)

Applied the three application files from FGD_Notification_Fix_Codex.zip on top of
push-recovery-20261024: public/sw.js, components/push/inbox-list.tsx and the new
components/push/notification-message-links.tsx (all under apps/web).
Every push click handled by the updated worker opens /account/notifications,
including old notifications with blank, /account, /store or external destinations.
This supersedes earlier sale-no-navigation and payment-/account click behavior;
payment message contents and server payload/eligibility remain unchanged.
General Updates remain in-app-only; this patch does not enable push for them.
The worker reuses a same-origin inbox/window, or opens the inbox if navigation
fails. It retains the existing large icon/badge and adds no caching/fetch handler.

Persisted message bodies render explicit http:// and https:// URLs as escaped React
text plus anchors. New tabs use noopener noreferrer. Unsafe schemes, malformed
URLs and credential-bearing URLs remain plain text. Sentence punctuation remains
visible outside links; line breaks and long-link wrapping remain. Bare www/domain
text is not linked; enter the full https:// URL. Existing title/message length limits
remain. No links are auto-opened, no composer/storage/auth/Owner changes are made.
Customer deletion and failure-recovery links remain available.

Notification login handoff: /account/notifications sends anonymous visitors to
/login?redirectTo=%2Faccount%2Fnotifications. The login page accepts only that exact
notification destination and passes it through the existing hidden form field.
Customer login returns directly to the inbox; Owner/admin login routes to their
existing /admin/notifications inbox. Already signed-in Owner/admin visits to the
customer inbox entry point also redirect to that internal administrative inbox.
Existing customer/admin guards, banned-user restrictions and device reconciliation
remain intact. Ordinary customer/Owner/admin login defaults are unchanged. The
Owner inbox contains existing administrative notifications; no customer-inbox
records are copied to Owners and no new test-message persistence is introduced.


Validation: 43 push/inbox checks, notification UI interactions including safe link
rendering, and session/login/refresh tests passed. Type-check passed. Production
build passed with exit code 0. Tests use mocks/in-memory PostgreSQL only.
No migration, production query, notification/email send or deployment is involved.

After separately authorized deployment, existing phones need the updated service
worker to activate. Close all FGD tabs/installed app windows and reopen FGD; allow
an update check, and close/reopen again if a worker is waiting. Existing displayed
notifications only use the new click behavior once the updated worker is active.
Physical Android/iPhone tap, login and external-link behavior still need testing.
Keep fgd-web:push-recovery-20261024 and its configuration for application rollback;
no new database migration is required. Local originals are backed up outside the
repository at C:/FGD-Private/notification-inbox-links-20261025/before.

Follow-up redirect changes: apps/web/app/account/notifications/page.tsx,
apps/web/app/login/page.tsx, apps/web/app/actions/session/login.ts;
scripts/test-session-push.cjs updated and scripts/test-notification-navigation.cjs
added. Local route/login tests cover anonymous/customer/Owner/admin/banned users,
exact destination allowlisting, ordinary-login defaults and failed device reconciliation.
No Supabase, session-cookie, subscription, schema or production settings changed.

### Owner composer simplification and CRM subscriber visibility (local; October 26, 2026)

Removed the Owner test-device registration panel from /admin/push and the unused
Owner-only rendering branch in NotificationSettings. Customer enrollment/recovery
continues using the same code. Existing composer previews, explicit confirmation,
Owner device test preview button and all sending rules remain unchanged.

Owner-only read-only phone subscriber panels added above CRM filters and after the
individual CRM record heading. This checkout has no Open Payment Info label.
The summary uses live existing user_roles, customer_profiles, push_preferences and
push_subscriptions data with ordered pagination; no endpoints/keys are returned.
Only customer roles are included, grouped by unique account ID, never display name.
Active devices require active=true and expires_at null or strictly in the future.
Missing preferences default to disabled. Duplicate device/customer IDs cannot
inflate counts. Invalid expiration timestamps are treated as inactive.

Registered + opted-in total counts customers with any category enabled and any
active registration, including a banned account if its registrations persist.
Sale/payment subscriber counts additionally exclude banned accounts, matching
phone recipient account restrictions. They indicate enrollment, not actual payment
reminder recipients: billing eligibility and cycle deduplication are still checked
only by the existing send workflow. General Updates are excluded from phone counts.

Summary buttons open all/active/sales/payment/recovery customer filters. Details
show saved category choices, active device count, recovery state and account bans,
with links to CRM records. Lists paginate at 25 visible rows. No enroll/recover/edit
controls are exposed. Counts refresh on page reload, not continuously. Separate
reads are not a transactional snapshot; concurrent account/device updates may be
reflected on the next reload. Counts never promise successful notification receipt.
Read errors display unavailable rather than zero. Admin/customer/anonymous roles
cannot access this new Owner-only summary. Existing CRM access is unchanged.

Files: apps/web/components/push/admin-push.tsx,
apps/web/components/push/notification-settings.tsx,
apps/web/app/admin/customers/page.tsx,
apps/web/app/admin/customers/[customerId]/page.tsx,
apps/web/lib/push/subscriber-summary.ts (new),
apps/web/lib/push/subscriber-reads.ts (new),
apps/web/components/push/crm-subscribers.tsx (new),
apps/web/components/push/crm-subscriber-panel.tsx (new),
scripts/test-crm-notifications.cjs (new), scripts/test-push-ui.cjs and this document.

Validation: node scripts/test-crm-notifications.cjs, npm run test:push (43 checks),
npm run test:push-ui and npm run typecheck passed. Production build passed with exit code 0.
Existing CRM financial/filter/action implementation verified byte-equivalent after
removing the new panel import/placement. No billing calculations changed.
No database migrations, production reads/writes, notification sends, browser access
or deployment. Existing production notification-links-20261025 remains untouched.
