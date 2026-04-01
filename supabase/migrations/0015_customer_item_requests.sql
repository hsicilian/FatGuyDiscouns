alter type public.notification_type add value if not exists 'customer_item_request';

create table if not exists public.customer_item_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  status text not null default 'open',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_item_requests_customer_created
  on public.customer_item_requests(customer_id, created_at desc);

alter table public.customer_item_requests enable row level security;
alter table public.customer_item_requests force row level security;

drop policy if exists customer_item_requests_owner_read on public.customer_item_requests;
drop policy if exists customer_item_requests_owner_insert on public.customer_item_requests;
drop policy if exists customer_item_requests_admin_all on public.customer_item_requests;

create policy customer_item_requests_owner_read
on public.customer_item_requests
for select
to authenticated
using (customer_id = auth.uid());

create policy customer_item_requests_owner_insert
on public.customer_item_requests
for insert
to authenticated
with check (customer_id = auth.uid() and coalesce(created_by, auth.uid()) = auth.uid());

create policy customer_item_requests_admin_all
on public.customer_item_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
