alter table public.products
  add column if not exists sale_percentage numeric(5,2),
  add column if not exists sale_ends_at timestamptz;

alter table public.products
  drop constraint if exists products_sale_percentage_check;

alter table public.products
  add constraint products_sale_percentage_check
  check (sale_percentage is null or (sale_percentage > 0 and sale_percentage < 100));

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

  select id
  into cycle_id
  from public.balance_cycles
  where customer_id = p_customer_id and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if cycle_id is null then
    insert into public.balance_cycles (customer_id, status, due_date)
    values (p_customer_id, 'active', current_date + 14)
    returning id into cycle_id;
  end if;

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
