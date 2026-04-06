alter table public.products
add column if not exists cost numeric(10,2);

alter table public.cross_listed_inventory
add column if not exists cost numeric(10,2);
