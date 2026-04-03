alter table public.products
add column if not exists homepage_featured boolean not null default false;
