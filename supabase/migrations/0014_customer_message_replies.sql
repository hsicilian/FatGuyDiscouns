do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'message_sender_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.message_sender_role as enum ('customer', 'admin');
  end if;
end
$$;

alter table public.customer_messages
  add column if not exists sender_role public.message_sender_role not null default 'customer';

update public.customer_messages
set sender_role = 'customer'
where sender_role is null;

drop policy if exists customer_messages_owner_insert on public.customer_messages;

create policy customer_messages_owner_insert
on public.customer_messages
for insert
to authenticated
with check (
  customer_id = auth.uid()
  and sender_role = 'customer'
  and coalesce(created_by, auth.uid()) = auth.uid()
);
