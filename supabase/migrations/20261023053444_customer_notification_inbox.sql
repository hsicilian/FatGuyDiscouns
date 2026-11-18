-- Customer inbox only. Existing administrative notifications and billing functions stay unchanged.
create table public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  send_id uuid not null references public.push_sends(id),
  title text not null,
  body text not null,
  category text not null check (category in ('sales','invoices')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(send_id, customer_id)
);
create index customer_notifications_visible on public.customer_notifications(customer_id, created_at desc, id desc) where deleted_at is null;
alter table public.customer_notifications enable row level security;
revoke all on public.customer_notifications from public, anon, authenticated;
grant select on public.customer_notifications to authenticated;
grant select, insert, update on public.customer_notifications to service_role;
create policy customer_notifications_own_read on public.customer_notifications for select to authenticated
  using (customer_id = (select auth.uid()) and deleted_at is null);

-- One atomic confirmation creates durable inbox messages, reserves reminder cycles,
-- and queues only consented phone devices. No transport or billing calculations here.
-- Retain the original RPC for pre-inbox previews and Owner-only tests.
create function public.push_confirm_inbox(p_send uuid, p_actor uuid, p_recipients jsonb)
returns void language plpgsql set search_path = public as $$
declare s public.push_sends; r jsonb; c uuid; reserved uuid[]; sub uuid; consent boolean;
begin
  select * into s from public.push_sends where id=p_send for update;
  if s.id is null or s.actor_id <> p_actor then raise exception 'Invalid send'; end if;
  if not exists (select 1 from public.user_roles where user_id=p_actor and role='master_admin' and account_state <> 'banned') then
    raise exception 'Owner access required';
  end if;
  if s.test_only or s.message->>'inApp' is distinct from 'true' then raise exception 'Not an inbox send'; end if;
  if s.message->'recipient'->>'mode' not in ('all','customer') or s.message->'recipient'->>'mode' is null then
    raise exception 'Invalid recipients';
  end if;
  if s.message->'recipient'->>'mode'='customer' and (s.message->'recipient'->>'customerId' is null or
    (s.message->'recipient'->>'customerId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    raise exception 'Invalid customer';
  end if;
  if s.status <> 'draft' then return; end if;
  if s.created_at < now()-interval '30 minutes' then raise exception 'Preview expired'; end if;
  for r in select value from jsonb_array_elements(p_recipients) order by value->>'userId' loop
    if s.message->'recipient'->>'mode'='customer' and (r->>'userId')::uuid <> (s.message->'recipient'->>'customerId')::uuid then
      raise exception 'Recipient mismatch';
    end if;
    if not exists (select 1 from public.user_roles where user_id=(r->>'userId')::uuid and role='customer' and account_state <> 'banned') then continue; end if;
    reserved := '{}';
    if s.category='invoices' then
      for c in select value::uuid from jsonb_array_elements_text(r->'cycleIds') order by value loop
        insert into public.push_reminder_cycles(customer_id,cycle_id,send_id) values ((r->>'userId')::uuid,c,p_send) on conflict do nothing;
        if found then reserved := array_append(reserved,c); end if;
      end loop;
      if cardinality(reserved)=0 then continue; end if;
    end if;
    insert into public.customer_notifications(customer_id,send_id,title,body,category)
      values ((r->>'userId')::uuid,p_send,s.message->>'title',s.message->>'body',s.category) on conflict do nothing;
    -- Deletion is a tombstone; retries cannot recreate or restore an inbox message.
    select case when s.category='sales' then sales else invoices end into consent
      from public.push_preferences where user_id=(r->>'userId')::uuid;
    if consent is not true then continue; end if;
    for sub in select value::uuid from jsonb_array_elements_text(r->'subscriptionIds') loop
      insert into public.push_deliveries(send_id,subscription_id,customer_id,cycle_ids)
      select p_send,id,user_id,reserved from public.push_subscriptions
        where id=sub and user_id=(r->>'userId')::uuid and active and (expires_at is null or expires_at>now())
      on conflict do nothing;
    end loop;
  end loop;
  update public.push_sends set status='queued',confirmed_at=now() where id=p_send;
end $$;
revoke all on function public.push_confirm_inbox(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.push_confirm_inbox(uuid,uuid,jsonb) to service_role;
