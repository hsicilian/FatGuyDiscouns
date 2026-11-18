# Current FGD production and development handoff

Verified on 2026-11-17. Production runs `fgd-web:account-credit-20261114` with
image ID `sha256:1c9acd7f3c9f66eb002d53c0ebe0649356c8ecf165f65594a6723b775624ea33`.
The repository application source and dependency manifests match the retained
production build context after normalizing line endings. Tests, documentation
and migration sources are also retained in Git.

Canonical repository: https://github.com/hsicilian/FatGuyDiscouns, branch `main`.
Server development checkout: `/home/codex/work/fat-guy-discounts`.
Commit and push reviewed changes so subsequent development starts from Git.

Production uses `/opt/fgd/production/compose.yaml`, `/etc/fgd/production.env`,
and container `fgd-production-fgd-production-1`. Runtime secrets stay outside Git.
The ignored `staging.env` is an exact copy of the PC's existing FGD staging
configuration. Inspect its configuration before development use, keep its values
private, and never run seed/import scripts against production.

The account-credit source migration `20261114185245_add_account_credit.sql` was
applied as production ledger version `20261114192351_add_account_credit`.
Earlier migrations can also have ledger timestamps different from filenames.
Inspect the production ledger before migrations. Do not blindly apply every
local migration to the existing database.

Rollback image: `fgd-web:crm-subscribers-20261026`.
Configuration backup: `/opt/fgd/account-credit-20261114`.
Retain the additive account-credit schema when rolling back the application.

`contabo-docker.md` records historical migration preparation. Use this document
for current production state. Deployment, production data changes and notification
sends require explicit authorization. The November 17 Git reconciliation involves
source synchronization only.
