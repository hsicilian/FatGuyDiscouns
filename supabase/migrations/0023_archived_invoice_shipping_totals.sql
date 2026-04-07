alter table public.archived_invoices
add column if not exists shipping_total numeric(12,2) not null default 0;
