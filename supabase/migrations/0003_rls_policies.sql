create or replace function public.current_app_role()
returns public.user_role
language sql
stable
as $$
  select coalesce((select role from public.user_roles where user_id = auth.uid()), 'customer'::public.user_role);
$$;

alter table public.user_roles enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.categories enable row level security;
alter table public.balance_cycles enable row level security;
alter table public.balance_line_items enable row level security;
alter table public.payments enable row level security;
alter table public.credits enable row level security;
alter table public.shipments enable row level security;
alter table public.notifications enable row level security;
alter table public.customer_notes enable row level security;
alter table public.events enable row level security;

create policy if not exists products_public_read
on public.products
for select
using (status in ('active', 'low_stock', 'out_of_stock'));

create policy if not exists categories_public_read
on public.categories
for select
using (true);

create policy if not exists events_public_read
on public.events
for select
using (true);

create policy if not exists customer_profiles_owner_read
on public.customer_profiles
for select
using (auth.uid() = user_id or public.current_app_role() in ('admin', 'master_admin'));

create policy if not exists customer_profiles_owner_update
on public.customer_profiles
for update
using (auth.uid() = user_id or public.current_app_role() in ('admin', 'master_admin'));

create policy if not exists addresses_owner_access
on public.addresses
for all
using (auth.uid() = user_id or public.current_app_role() in ('admin', 'master_admin'));

create policy if not exists user_roles_admin_read
on public.user_roles
for select
using (auth.uid() = user_id or public.current_app_role() in ('admin', 'master_admin'));

create policy if not exists user_roles_admin_update
on public.user_roles
for update
using (public.current_app_role() in ('admin', 'master_admin'));

create policy if not exists products_admin_write
on public.products
for all
using (public.current_app_role() in ('admin', 'master_admin'));

create policy if not exists product_images_admin_write
on public.product_images
for all
using (public.current_app_role() in ('admin', 'master_admin'));

create policy if not exists balance_cycles_owner_read
on public.balance_cycles
for select
using (customer_id = auth.uid() or public.current_app_role() in ('admin', 'master_admin'));

create policy if not exists balance_line_items_owner_read
on public.balance_line_items
for select
using (
  exists (
    select 1
    from public.balance_cycles cycles
    where cycles.id = balance_line_items.cycle_id
      and (cycles.customer_id = auth.uid() or public.current_app_role() in ('admin', 'master_admin'))
  )
);

create policy if not exists payments_owner_read
on public.payments
for select
using (
  exists (
    select 1
    from public.balance_cycles cycles
    where cycles.id = payments.cycle_id
      and (cycles.customer_id = auth.uid() or public.current_app_role() in ('admin', 'master_admin'))
  )
);

create policy if not exists credits_owner_read
on public.credits
for select
using (customer_id = auth.uid() or public.current_app_role() in ('admin', 'master_admin'));

create policy if not exists shipments_owner_read
on public.shipments
for select
using (customer_id = auth.uid() or public.current_app_role() in ('admin', 'master_admin'));

create policy if not exists shipments_admin_write
on public.shipments
for all
using (public.current_app_role() in ('admin', 'master_admin'));

create policy if not exists notifications_admin_read
on public.notifications
for select
using (public.current_app_role() in ('admin', 'master_admin'));

create policy if not exists customer_notes_admin_only
on public.customer_notes
for all
using (public.current_app_role() in ('admin', 'master_admin'));

