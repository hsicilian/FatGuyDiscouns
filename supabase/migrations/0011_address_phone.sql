alter table if exists public.addresses
  add column if not exists phone text;
