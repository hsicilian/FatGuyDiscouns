alter table public.products
  add column if not exists archived_at timestamptz;

create index if not exists idx_products_archived_at on public.products(archived_at desc);
