alter table if exists public.customer_profiles
  add column if not exists fulfillment_method text not null default 'shipping';
