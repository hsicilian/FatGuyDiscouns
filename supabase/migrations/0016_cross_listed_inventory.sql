create table if not exists public.cross_listed_inventory (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  item_name text not null,
  platforms text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cross_listed_inventory_sku
  on public.cross_listed_inventory(sku);

create index if not exists idx_cross_listed_inventory_item_name
  on public.cross_listed_inventory(item_name);

alter table public.cross_listed_inventory enable row level security;
alter table public.cross_listed_inventory force row level security;

drop policy if exists cross_listed_inventory_master_admin_all on public.cross_listed_inventory;

create policy cross_listed_inventory_master_admin_all
on public.cross_listed_inventory
for all
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());
