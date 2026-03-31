create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  input_display_name text;
  input_timezone text;
  input_address text;
  address_line1 text;
begin
  input_display_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));
  input_timezone := coalesce(new.raw_user_meta_data ->> 'timezone', 'America/New_York');
  input_address := coalesce(new.raw_user_meta_data ->> 'address', 'Address pending confirmation');
  address_line1 := left(input_address, 255);

  insert into public.user_roles (user_id, role, account_state)
  values (new.id, 'customer', 'pending_approval')
  on conflict (user_id) do nothing;

  insert into public.customer_profiles (user_id, display_name, timezone)
  values (new.id, input_display_name, input_timezone)
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    timezone = excluded.timezone,
    updated_at = now();

  insert into public.addresses (user_id, line1, city, region, postal_code, country, is_default)
  values (new.id, address_line1, 'Pending', 'Pending', 'Pending', 'US', true)
  on conflict do nothing;

  update public.customer_profiles
  set default_address_id = (
    select id from public.addresses where user_id = new.id and is_default = true order by created_at asc limit 1
  )
  where user_id = new.id;

  insert into public.notifications (type, customer_id, payload)
  values (
    'pending_approval',
    new.id,
    jsonb_build_object(
      'label', concat(input_display_name, ' is waiting for account approval.'),
      'email', new.email
    )
  );

  return new;
end;
$$;
