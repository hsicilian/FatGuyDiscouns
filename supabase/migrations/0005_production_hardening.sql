create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin'::public.user_role, 'master_admin'::public.user_role);
$$;

create or replace function public.is_master_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'master_admin'::public.user_role;
$$;

alter table public.user_roles enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.categories enable row level security;
alter table public.balance_cycles enable row level security;
alter table public.balance_line_items enable row level security;
alter table public.archived_invoices enable row level security;
alter table public.payments enable row level security;
alter table public.credits enable row level security;
alter table public.shipments enable row level security;
alter table public.notifications enable row level security;
alter table public.customer_notes enable row level security;
alter table public.events enable row level security;
alter table public.restock_requests enable row level security;

alter table public.user_roles force row level security;
alter table public.customer_profiles force row level security;
alter table public.addresses force row level security;
alter table public.products force row level security;
alter table public.product_images force row level security;
alter table public.categories force row level security;
alter table public.balance_cycles force row level security;
alter table public.balance_line_items force row level security;
alter table public.archived_invoices force row level security;
alter table public.payments force row level security;
alter table public.credits force row level security;
alter table public.shipments force row level security;
alter table public.notifications force row level security;
alter table public.customer_notes force row level security;
alter table public.events force row level security;
alter table public.restock_requests force row level security;

alter table public.product_images
  add column if not exists storage_path text;

create index if not exists idx_product_images_product_position
  on public.product_images(product_id, position);

create index if not exists idx_product_images_storage_path
  on public.product_images(storage_path)
  where storage_path is not null;

drop policy if exists user_roles_self_read on public.user_roles;
drop policy if exists user_roles_admin_read on public.user_roles;
drop policy if exists user_roles_admin_update on public.user_roles;
create policy user_roles_self_read
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);
create policy user_roles_admin_read
on public.user_roles
for select
to authenticated
using (public.is_admin());

drop policy if exists customer_profiles_owner_read on public.customer_profiles;
drop policy if exists customer_profiles_owner_update on public.customer_profiles;
drop policy if exists customer_profiles_admin_read on public.customer_profiles;
drop policy if exists customer_profiles_admin_update on public.customer_profiles;
create policy customer_profiles_owner_read
on public.customer_profiles
for select
to authenticated
using (auth.uid() = user_id);
create policy customer_profiles_owner_update
on public.customer_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create policy customer_profiles_admin_read
on public.customer_profiles
for select
to authenticated
using (public.is_admin());
create policy customer_profiles_admin_update
on public.customer_profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists addresses_owner_access on public.addresses;
drop policy if exists addresses_owner_read on public.addresses;
drop policy if exists addresses_owner_insert on public.addresses;
drop policy if exists addresses_owner_update on public.addresses;
drop policy if exists addresses_owner_delete on public.addresses;
drop policy if exists addresses_admin_all on public.addresses;
create policy addresses_owner_read
on public.addresses
for select
to authenticated
using (auth.uid() = user_id);
create policy addresses_owner_insert
on public.addresses
for insert
to authenticated
with check (auth.uid() = user_id);
create policy addresses_owner_update
on public.addresses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create policy addresses_owner_delete
on public.addresses
for delete
to authenticated
using (auth.uid() = user_id);
create policy addresses_admin_all
on public.addresses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists categories_public_read on public.categories;
drop policy if exists categories_admin_all on public.categories;
create policy categories_public_read
on public.categories
for select
to anon, authenticated
using (true);
create policy categories_admin_all
on public.categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists products_public_read on public.products;
drop policy if exists products_admin_write on public.products;
drop policy if exists products_admin_all on public.products;
create policy products_public_read
on public.products
for select
to anon, authenticated
using (status in ('active', 'low_stock', 'out_of_stock'));
create policy products_admin_all
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists product_images_admin_write on public.product_images;
drop policy if exists product_images_public_read on public.product_images;
drop policy if exists product_images_admin_all on public.product_images;
create policy product_images_public_read
on public.product_images
for select
to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.products
    where products.id = product_images.product_id
      and products.status in ('active', 'low_stock', 'out_of_stock')
  )
);
create policy product_images_admin_all
on public.product_images
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists balance_cycles_owner_read on public.balance_cycles;
drop policy if exists balance_cycles_admin_all on public.balance_cycles;
create policy balance_cycles_owner_read
on public.balance_cycles
for select
to authenticated
using (customer_id = auth.uid());
create policy balance_cycles_admin_all
on public.balance_cycles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists balance_line_items_owner_read on public.balance_line_items;
drop policy if exists balance_line_items_admin_all on public.balance_line_items;
create policy balance_line_items_owner_read
on public.balance_line_items
for select
to authenticated
using (
  exists (
    select 1
    from public.balance_cycles cycles
    where cycles.id = balance_line_items.cycle_id
      and cycles.customer_id = auth.uid()
  )
);
create policy balance_line_items_admin_all
on public.balance_line_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists archived_invoices_owner_read on public.archived_invoices;
drop policy if exists archived_invoices_admin_all on public.archived_invoices;
create policy archived_invoices_owner_read
on public.archived_invoices
for select
to authenticated
using (customer_id = auth.uid());
create policy archived_invoices_admin_all
on public.archived_invoices
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists payments_owner_read on public.payments;
drop policy if exists payments_admin_all on public.payments;
create policy payments_owner_read
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.balance_cycles cycles
    where cycles.id = payments.cycle_id
      and cycles.customer_id = auth.uid()
  )
);
create policy payments_admin_all
on public.payments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists credits_owner_read on public.credits;
drop policy if exists credits_admin_all on public.credits;
create policy credits_owner_read
on public.credits
for select
to authenticated
using (customer_id = auth.uid());
create policy credits_admin_all
on public.credits
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists shipments_owner_read on public.shipments;
drop policy if exists shipments_admin_write on public.shipments;
drop policy if exists shipments_admin_all on public.shipments;
create policy shipments_owner_read
on public.shipments
for select
to authenticated
using (customer_id = auth.uid());
create policy shipments_admin_all
on public.shipments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists notifications_admin_read on public.notifications;
drop policy if exists notifications_admin_all on public.notifications;
create policy notifications_admin_all
on public.notifications
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists customer_notes_admin_only on public.customer_notes;
drop policy if exists customer_notes_admin_all on public.customer_notes;
create policy customer_notes_admin_all
on public.customer_notes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists events_public_read on public.events;
drop policy if exists events_admin_all on public.events;
create policy events_public_read
on public.events
for select
to anon, authenticated
using (true);
create policy events_admin_all
on public.events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists restock_requests_customer_insert on public.restock_requests;
drop policy if exists restock_requests_customer_read on public.restock_requests;
drop policy if exists restock_requests_admin_read on public.restock_requests;
drop policy if exists restock_requests_admin_update on public.restock_requests;
drop policy if exists restock_requests_admin_all on public.restock_requests;
create policy restock_requests_customer_insert
on public.restock_requests
for insert
to anon, authenticated
with check (
  (auth.uid() is null and customer_id is null)
  or (auth.uid() = customer_id)
);
create policy restock_requests_customer_read
on public.restock_requests
for select
to authenticated
using (customer_id = auth.uid());
create policy restock_requests_admin_all
on public.restock_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product images public read" on storage.objects;
drop policy if exists "product images admin insert" on storage.objects;
drop policy if exists "product images admin update" on storage.objects;
drop policy if exists "product images admin delete" on storage.objects;
create policy "product images public read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');
create policy "product images admin insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_admin());
create policy "product images admin update"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());
create policy "product images admin delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images' and public.is_admin());
