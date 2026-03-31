create extension if not exists "pgcrypto";

create type public.invoice_status as enum ('draft', 'paid', 'archived');
create type public.line_item_status as enum ('claimed', 'adjusted', 'archived');
create type public.restock_request_status as enum ('open', 'reviewed', 'closed');

alter table if exists public.user_roles
  add constraint user_roles_user_fk foreign key (user_id) references auth.users(id) on delete cascade;

alter table if exists public.customer_profiles
  add constraint customer_profiles_user_fk foreign key (user_id) references auth.users(id) on delete cascade;

alter table if exists public.addresses
  add column if not exists is_default boolean not null default false,
  add constraint addresses_user_fk foreign key (user_id) references auth.users(id) on delete cascade;

alter table if exists public.balance_cycles
  add constraint balance_cycles_customer_fk foreign key (customer_id) references auth.users(id) on delete cascade;

alter table if exists public.credits
  add constraint credits_customer_fk foreign key (customer_id) references auth.users(id) on delete cascade;

alter table if exists public.shipments
  add column if not exists address_id uuid,
  add column if not exists address_confirmed boolean not null default false,
  add constraint shipments_customer_fk foreign key (customer_id) references auth.users(id) on delete cascade,
  add constraint shipments_address_fk foreign key (address_id) references public.addresses(id) on delete set null;

alter table if exists public.notifications
  add column if not exists read_at timestamptz,
  add constraint notifications_customer_fk foreign key (customer_id) references auth.users(id) on delete cascade,
  add constraint notifications_product_fk foreign key (product_id) references public.products(id) on delete cascade;

alter table if exists public.customer_notes
  add constraint customer_notes_customer_fk foreign key (customer_id) references auth.users(id) on delete cascade,
  add constraint customer_notes_created_by_fk foreign key (created_by) references auth.users(id) on delete set null;

alter table if exists public.balance_line_items
  add column if not exists status public.line_item_status not null default 'claimed',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.archived_invoices (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null unique references public.balance_cycles(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  cycle_label text not null,
  paid_at date not null,
  total numeric(12,2) not null default 0,
  payment_total numeric(12,2) not null default 0,
  credit_applied numeric(12,2) not null default 0,
  status public.invoice_status not null default 'archived',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restock_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  email text,
  status public.restock_request_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, customer_id, status)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.derive_product_status(quantity integer, current_status public.product_status)
returns public.product_status
language plpgsql
immutable
as $$
begin
  if current_status in ('draft', 'hidden', 'archived') then
    return current_status;
  end if;

  if quantity <= 0 then
    return 'out_of_stock';
  elsif quantity = 1 then
    return 'low_stock';
  else
    return 'active';
  end if;
end;
$$;

create or replace function public.apply_product_status_trigger()
returns trigger
language plpgsql
as $$
begin
  new.status = public.derive_product_status(new.inventory_quantity, new.status);
  return new;
end;
$$;

create or replace function public.current_app_role()
returns public.user_role
language sql
stable
as $$
  select coalesce((select role from public.user_roles where user_id = auth.uid()), 'customer'::public.user_role);
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  input_display_name text;
  input_timezone text;
  input_address text;
  address_line1 text;
begin
  input_display_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));
  input_timezone := coalesce(new.raw_user_meta_data ->> 'timezone', 'America/New_York');
  input_address := coalesce(new.raw_user_meta_data ->> 'address', 'Address pending confirmation');
  address_line1 := left(input_address, 255);

  insert into public.user_roles (user_id, role, account_state)
  values (new.id, 'customer', 'pending_approval')
  on conflict (user_id) do nothing;

  insert into public.customer_profiles (user_id, display_name, timezone)
  values (new.id, input_display_name, input_timezone)
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    timezone = excluded.timezone,
    updated_at = now();

  insert into public.addresses (user_id, line1, city, region, postal_code, country, is_default)
  values (new.id, address_line1, 'Pending', 'Pending', 'Pending', 'US', true)
  on conflict do nothing;

  update public.customer_profiles
  set default_address_id = (
    select id from public.addresses where user_id = new.id and is_default = true order by created_at asc limit 1
  )
  where user_id = new.id;

  return new;
end;
$$;

create or replace function public.app_claim_product(p_product_id uuid, p_quantity integer default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_state public.account_state;
  current_role public.user_role;
  current_product public.products%rowtype;
  cycle_id uuid;
  remaining_quantity integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select role, account_state into current_role, current_state
  from public.user_roles
  where user_id = current_user_id;

  if current_role <> 'customer' or current_state <> 'approved' then
    raise exception 'Only approved customers can claim items';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least 1';
  end if;

  select * into current_product
  from public.products
  where id = p_product_id
  for update;

  if current_product.id is null then
    raise exception 'Product not found';
  end if;

  if current_product.inventory_quantity < p_quantity then
    raise exception 'Not enough inventory is available';
  end if;

  select id into cycle_id
  from public.balance_cycles
  where customer_id = current_user_id and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if cycle_id is null then
    insert into public.balance_cycles (customer_id, status, due_date)
    values (current_user_id, 'active', current_date + 14)
    returning id into cycle_id;
  end if;

  update public.products
  set inventory_quantity = inventory_quantity - p_quantity,
      status = public.derive_product_status(inventory_quantity - p_quantity, status),
      updated_at = now()
  where id = p_product_id
  returning inventory_quantity into remaining_quantity;

  insert into public.balance_line_items (cycle_id, product_id, item_type, description, quantity, unit_price, status, created_by)
  values (cycle_id, current_product.id, 'claim', current_product.title, p_quantity, current_product.price, 'claimed', current_user_id);

  insert into public.notifications (type, customer_id, product_id, payload)
  values ('new_claim', current_user_id, current_product.id, jsonb_build_object('quantity', p_quantity, 'title', current_product.title));

  if remaining_quantity = 1 then
    insert into public.notifications (type, product_id, payload)
    values ('low_stock', current_product.id, jsonb_build_object('title', current_product.title, 'quantity', remaining_quantity));
  end if;

  return jsonb_build_object('cycle_id', cycle_id, 'remaining_quantity', remaining_quantity);
end;
$$;

create trigger set_user_roles_updated_at before update on public.user_roles for each row execute function public.set_updated_at();
create trigger set_addresses_updated_at before update on public.addresses for each row execute function public.set_updated_at();
create trigger set_customer_profiles_updated_at before update on public.customer_profiles for each row execute function public.set_updated_at();
create trigger set_products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger set_balance_cycles_updated_at before update on public.balance_cycles for each row execute function public.set_updated_at();
create trigger set_balance_line_items_updated_at before update on public.balance_line_items for each row execute function public.set_updated_at();
create trigger set_shipments_updated_at before update on public.shipments for each row execute function public.set_updated_at();
create trigger set_events_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger set_archived_invoices_updated_at before update on public.archived_invoices for each row execute function public.set_updated_at();
create trigger set_restock_requests_updated_at before update on public.restock_requests for each row execute function public.set_updated_at();
create trigger products_derive_status before insert or update on public.products for each row execute function public.apply_product_status_trigger();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create index if not exists idx_addresses_user_default on public.addresses(user_id, is_default);
create index if not exists idx_balance_line_items_cycle_created on public.balance_line_items(cycle_id, created_at desc);
create index if not exists idx_archived_invoices_customer_paid on public.archived_invoices(customer_id, paid_at desc);
create index if not exists idx_customer_notes_customer_created on public.customer_notes(customer_id, created_at desc);
create index if not exists idx_notifications_created on public.notifications(created_at desc);
create index if not exists idx_restock_requests_status_created on public.restock_requests(status, created_at desc);
create index if not exists idx_shipments_cycle on public.shipments(cycle_id);

alter table public.archived_invoices enable row level security;
alter table public.restock_requests enable row level security;

create policy archived_invoices_owner_read
on public.archived_invoices
for select
using (customer_id = auth.uid() or public.current_app_role() in ('admin', 'master_admin'));

create policy restock_requests_customer_insert
on public.restock_requests
for insert
with check (auth.uid() = customer_id or customer_id is null);

create policy restock_requests_admin_read
on public.restock_requests
for select
using (public.current_app_role() in ('admin', 'master_admin'));

create policy restock_requests_admin_update
on public.restock_requests
for update
using (public.current_app_role() in ('admin', 'master_admin'));
alter type public.line_item_type add value if not exists 'manual_item';

alter table if exists public.balance_cycles
  add column if not exists shipping_total numeric(12,2) not null default 0,
  add column if not exists adjustments_total numeric(12,2) not null default 0,
  add column if not exists payments_applied numeric(12,2) not null default 0,
  add column if not exists credits_applied numeric(12,2) not null default 0;

