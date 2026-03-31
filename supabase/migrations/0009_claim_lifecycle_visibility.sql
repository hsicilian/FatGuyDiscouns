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
  customer_label text;
begin
  if p_customer_id is null then
    raise exception 'Customer is required';
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

  select id into cycle_id
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
    current_product.price,
    'claimed',
    p_customer_id
  );

  update public.balance_cycles
  set updated_at = now()
  where id = cycle_id;

  select coalesce(cp.display_name, au.email, 'Customer')
  into customer_label
  from auth.users au
  left join public.customer_profiles cp on cp.user_id = au.id
  where au.id = p_customer_id;

  insert into public.notifications (type, customer_id, product_id, payload)
  values (
    'new_claim',
    p_customer_id,
    current_product.id,
    jsonb_build_object(
      'quantity', p_quantity,
      'title', current_product.title,
      'customer_name', customer_label,
      'label', customer_label || ' claimed ' || p_quantity || ' x ' || current_product.title || '.'
    )
  );

  if remaining_quantity = 1 then
    insert into public.notifications (type, product_id, payload)
    values (
      'low_stock',
      current_product.id,
      jsonb_build_object('title', current_product.title, 'quantity', remaining_quantity)
    );
  end if;

  return jsonb_build_object('cycle_id', cycle_id, 'remaining_quantity', remaining_quantity);
end;
$$;
