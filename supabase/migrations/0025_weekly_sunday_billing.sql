begin;

-- Calendar dates use the same Eastern billing day as the web application.
create or replace function public.weekly_billing_due_date(p_reference_date date)
returns date language sql immutable strict
set search_path = public
as $$
  select p_reference_date + ((7 - extract(dow from p_reference_date)::integer) % 7);
$$;

-- Serialize cycle creation across claims, manual items, and shipping charges.
-- Do not merge existing cycles: their financial and shipment links must survive.
create or replace function public.ensure_weekly_balance_cycle(
  p_customer_id uuid,
  p_reference_date date default (now() at time zone 'America/New_York')::date
)
returns public.balance_cycles
language plpgsql security definer
set search_path = public
as $$
declare
  target_due_date date := public.weekly_billing_due_date(p_reference_date);
  target_cycle public.balance_cycles%rowtype;
begin
  if p_customer_id is null or p_reference_date is null then
    raise exception 'Customer and reference date are required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text, 0));
  select * into target_cycle
  from public.balance_cycles
  where customer_id = p_customer_id and status = 'active' and due_date = target_due_date
  order by created_at, id
  limit 1
  for update;
  if target_cycle.id is null then
    insert into public.balance_cycles (customer_id, status, due_date)
    values (p_customer_id, 'active', target_due_date)
    returning * into target_cycle;
  end if;
  return target_cycle;
end;
$$;

revoke all on function public.ensure_weekly_balance_cycle(uuid, date) from public, anon, authenticated;
grant execute on function public.ensure_weekly_balance_cycle(uuid, date) to service_role;

-- One-time conversion, not a rolling read-time rewrite. Never postpone overdue
-- dates, merge rows, or alter a cycle already represented by an archived invoice.
update public.balance_cycles bc
set due_date = public.weekly_billing_due_date((now() at time zone 'America/New_York')::date)
where bc.status = 'active'
  and bc.due_date >= (now() at time zone 'America/New_York')::date
  and bc.due_date <> public.weekly_billing_due_date((now() at time zone 'America/New_York')::date)
  and not exists (select 1 from public.archived_invoices ai where ai.cycle_id = bc.id);

-- Preserve the existing claim routines below, replacing only cycle selection.
create or replace function public.admin_claim_product(
  p_customer_id uuid,
  p_product_id uuid,
  p_quantity integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_product public.products%rowtype;
  cycle_id uuid;
  remaining_quantity integer;
  effective_price numeric(12,2);
begin
  if p_customer_id is null then
    raise exception 'Customer is required';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least 1';
  end if;

  select *
  into current_product
  from public.products
  where id = p_product_id
  for update;

  if current_product.id is null then
    raise exception 'Product not found';
  end if;

  if current_product.inventory_quantity < p_quantity then
    raise exception 'Not enough inventory is available';
  end if;

  select id into cycle_id from public.ensure_weekly_balance_cycle(p_customer_id);

  effective_price := current_product.price;

  if current_product.sale_percentage is not null
    and current_product.sale_percentage > 0
    and current_product.sale_ends_at is not null
    and current_product.sale_ends_at > now() then
    effective_price := round((current_product.price * (1 - current_product.sale_percentage / 100.0))::numeric, 2);
  end if;

  update public.products
  set inventory_quantity = inventory_quantity - p_quantity,
      status = public.derive_product_status(inventory_quantity - p_quantity, status),
      updated_at = now()
  where id = p_product_id
  returning inventory_quantity into remaining_quantity;

  insert into public.balance_line_items (
    cycle_id,
    product_id,
    item_type,
    description,
    quantity,
    unit_price,
    status,
    created_by
  )
  values (
    cycle_id,
    current_product.id,
    'claim',
    current_product.title,
    p_quantity,
    effective_price,
    'claimed',
    p_customer_id
  );

  update public.balance_cycles
  set updated_at = now()
  where id = cycle_id;

  insert into public.notifications (
    type,
    customer_id,
    product_id,
    payload
  )
  values (
    'new_claim',
    p_customer_id,
    current_product.id,
    jsonb_build_object(
      'label',
      coalesce(
        (select cp.display_name from public.customer_profiles cp where cp.user_id = p_customer_id),
        'Customer'
      ) || ' claimed ' || p_quantity || ' x ' || current_product.title || '.'
    )
  );

  if remaining_quantity = 1 then
    insert into public.notifications (
      type,
      customer_id,
      product_id,
      payload
    )
    values (
      'low_stock',
      p_customer_id,
      current_product.id,
      jsonb_build_object('label', current_product.title || ' reached low stock.')
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'cycle_id', cycle_id,
    'remaining_quantity', remaining_quantity,
    'unit_price', effective_price
  );
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
  claimant_role public.user_role;
  current_product public.products%rowtype;
  cycle_id uuid;
  remaining_quantity integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select role, account_state into claimant_role, current_state
  from public.user_roles
  where user_id = current_user_id;

  if claimant_role <> 'customer' or current_state <> 'approved' then
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

  select id into cycle_id from public.ensure_weekly_balance_cycle(current_user_id);

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


commit;

