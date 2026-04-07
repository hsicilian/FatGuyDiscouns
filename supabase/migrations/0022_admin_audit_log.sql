create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  actor_name text not null,
  actor_role public.user_role not null,
  action_type text not null,
  entity_type text not null,
  entity_id text,
  target_customer_id uuid,
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_log_created_at
  on public.admin_audit_log(created_at desc);

create index if not exists idx_admin_audit_log_target_customer
  on public.admin_audit_log(target_customer_id, created_at desc);

alter table public.admin_audit_log enable row level security;
alter table public.admin_audit_log force row level security;

drop policy if exists admin_audit_log_master_admin_all on public.admin_audit_log;
create policy admin_audit_log_master_admin_all
on public.admin_audit_log
for all
using (
  exists (
    select 1
    from public.user_roles roles
    where roles.user_id = auth.uid()
      and roles.role = 'master_admin'
  )
)
with check (
  exists (
    select 1
    from public.user_roles roles
    where roles.user_id = auth.uid()
      and roles.role = 'master_admin'
  )
);
