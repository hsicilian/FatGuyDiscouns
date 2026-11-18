# FGD Docker preparation

Historical preparation notes. See [current production](current-production.md)
for current release and deployment paths. The old baseline-archive procedure
below is retained as historical context.

## Release baseline

Application baseline: `ec656a38ba5a4522d92833945bc13884ac6d9325`
(`Switch billing schedule to weekly Sunday payments`). The existing deployment
chat records the push of this commit and a successful production health response.
The owner subsequently confirmed the weekly billing release is deployed and working.
The Render dashboard build ID was not independently available. Local application
source matches that commit; do not rerun migrations or alter billing for this move.

The working tree also contains local-only test dependency changes in package.json
and package-lock.json, plus billing test/docs/migration artifacts. Preserve them.
For the migration image, use a source archive of the baseline commit plus exactly
these packaging files: Dockerfile, .dockerignore, compose.fgd.yaml, and the updated
apps/web/next.config.ts. This retains the production dependency manifests and
avoids accidentally including local test changes. `git archive` is a read-only
export; do not reset, stash, stage, or commit the existing work to prepare it.
After packaging is separately approved/committed, record its exact revision too.

## Image and configuration

Build context is the repository root. The builder uses Node 24 Debian slim,
`npm ci` with the existing lockfile, and `npm run build:web`. The final image
contains Next.js standalone output plus static/public assets, runs as the
unprivileged node user, and listens on port 3000. Monorepo tracing includes the
shared packages. No application server wrapper or extra dependency is added.
The Node major is explicit; before production, record/pin the tested image digest.

Build/Compose inputs (public values, supplied externally):

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SITE_URL: keep `https://fatguydiscounts.com` if that remains canonical
- FGD_IMAGE_TAG: unique tag for the reviewed packaging release
- FGD_PROXY_NETWORK: approved external Docker network connecting only Caddy and FGD
- FGD_RUNTIME_ENV_FILE: absolute path to a private FGD-only env file outside the repo

Public values are embedded at build time and must match runtime. The private env
file supplies SUPABASE_SERVICE_ROLE_KEY, SITE_URL (same canonical URL),
SUPABASE_PRODUCT_IMAGES_BUCKET, and the existing SMTP_HOST, SMTP_PORT, SMTP_USER,
SMTP_PASS, SMTP_FROM_EMAIL, SMTP_FROM_NAME, ADMIN_NOTIFICATION_EMAIL settings if
admin email is used. Preserve the current Supabase project and storage bucket.
Never pass service-role/SMTP secrets as build args. Do not commit env files.
Do not dump resolved Compose configuration with real secrets into logs.

Compose publishes no host port and starts no database or Caddy container. It uses
an explicit external proxy network and the `fgd-web` alias. The existing Caddy
container must be attached to the approved network during a separately authorized
deployment. The proposed route for its existing configuration is:

```caddyfile
fatguydiscounts.com {
    reverse_proxy fgd-web:3000
}
```

This is a proposed stanza, not a replacement Caddyfile. Actual Caddy topology,
hostname aliases/redirects, network availability, and resource limits must be
checked before deployment. If Caddy runs on the host instead of in Docker, this
network-only recipe must be adapted to an approved loopback-bound port.
Do not widen Next.js server-action allowed origins without a demonstrated need.

The image health check tests `/api/health`. This only checks configured public
Supabase settings; it does not prove database, auth, SMTP, or storage connectivity.
Next.js cache is writable by the node user; no customer data volume is needed.

## Validation and deployment boundary

Development validation must use installed tooling and non-production dummy
configuration. A real image build runs the existing dependency install inside
Docker; do not run it without approval under the current no-install boundary.
No new packages are needed. A local source build does not replace a Linux image
build/start test. Record those results separately.

Validation performed on 2026-10-21:

- Exported the baseline with `git archive` into a temporary directory and overlaid
  only the packaging files. Reused installed dependencies through local junctions;
  no install was run. Existing checkout build output was not overwritten.
- Node 24.14.0 / npm 11.9.0: `npm run build:web` exited 0; compilation, type
  checking, and page generation passed using dummy loopback Supabase settings.
- Standalone assembly emitted Windows EPERM when copying a node_modules junction.
  The Windows standalone artifact is therefore not accepted as a complete image
  substitute. Linux standalone startup remains unverified.
- Docker Compose 5.5.1: `config --quiet` passed with dummy values. Resolved config
  has no published host ports, an external proxy network, and only public build args.
- Docker CLI is installed, but the local Linux engine is unavailable. No Docker
  image build, dependency install, image pull, or container startup was performed.
- Existing uncommitted files retained their original SHA-256 hashes.

Before a separately authorized deployment:

1. Build/test the reviewed Linux image, confirm startup, static assets, health,
   clean shutdown, and non-root runtime. Pin the resulting base/image digests.
2. Check VPS capacity and the proposed network/route without changing Office or
   Scheduler. Supply isolated FGD secrets; verify outbound Supabase and SMTP access.
3. Stage through Caddy using the intended host/protocol, verify existing auth
   callbacks, server actions, uploads, and customer/admin flows using an approved
   test account. Do not apply SQL migrations, seed data, or import customer data.
4. Separately approve DNS cutover. Keep Render active and retain the previous DNS
   target and image for rollback. Verify the live site before cancelling Render.

Push notifications are outside this change.
