create table if not exists public.customer_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_messages_customer_created
  on public.customer_messages(customer_id, created_at desc);

alter table public.customer_messages enable row level security;
alter table public.customer_messages force row level security;

drop policy if exists customer_messages_owner_read on public.customer_messages;
drop policy if exists customer_messages_owner_insert on public.customer_messages;
drop policy if exists customer_messages_admin_all on public.customer_messages;

create policy customer_messages_owner_read
on public.customer_messages
for select
to authenticated
using (customer_id = auth.uid());

create policy customer_messages_owner_insert
on public.customer_messages
for insert
to authenticated
with check (customer_id = auth.uid() and coalesce(created_by, auth.uid()) = auth.uid());

create policy customer_messages_admin_all
on public.customer_messages
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
