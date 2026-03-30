create extension if not exists "pgcrypto";

create type public.user_role as enum ('customer', 'admin', 'master_admin');
create type public.account_state as enum ('pending_approval', 'approved', 'claiming_disabled', 'banned');
create type public.product_status as enum ('draft', 'active', 'low_stock', 'out_of_stock', 'hidden', 'archived');
create type public.shipment_status as enum ('none', 'requested', 'in_progress', 'completed');
create type public.balance_cycle_status as enum ('active', 'archived', 'overdue');
create type public.line_item_type as enum ('claim', 'shipping', 'manual_adjustment');
create type public.notification_type as enum ('new_claim', 'shipment_request', 'pending_approval', 'low_stock', 'restock_request');

create table if not exists public.user_roles (
  user_id uuid primary key,
  role public.user_role not null default 'customer',
  account_state public.account_state not null default 'pending_approval',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  line1 text not null,
  line2 text,
  city text not null,
  region text not null,
  postal_code text not null,
  country text not null default 'US',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_profiles (
  user_id uuid primary key,
  display_name text,
  timezone text not null default 'America/New_York',
  default_address_id uuid references public.addresses(id),
  credit_balance numeric(12,2) not null default 0,
  last_shipment_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  price numeric(12,2) not null,
  category_id uuid references public.categories(id),
  sku text,
  location text,
  inventory_quantity integer not null default 0 check (inventory_quantity >= 0),
  status public.product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique(product_id, position)
);

create table if not exists public.balance_cycles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  status public.balance_cycle_status not null default 'active',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.balance_line_items (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.balance_cycles(id) on delete cascade,
  product_id uuid references public.products(id),
  item_type public.line_item_type not null,
  description text not null,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.balance_cycles(id) on delete cascade,
  amount numeric(12,2) not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.credits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  amount numeric(12,2) not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.balance_cycles(id),
  customer_id uuid not null,
  status public.shipment_status not null default 'none',
  tracking_number text,
  shipment_date date,
  requested_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type public.notification_type not null,
  customer_id uuid,
  product_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  body text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  description text not null default '',
  external_link text,
  platform text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_sku on public.products(sku);
create index if not exists idx_balance_cycles_customer_status on public.balance_cycles(customer_id, status);
create index if not exists idx_shipments_customer_status on public.shipments(customer_id, status);
create index if not exists idx_notifications_type_created_at on public.notifications(type, created_at desc);
create index if not exists idx_events_starts_at on public.events(starts_at);

