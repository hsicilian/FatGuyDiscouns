-- Extend notification categories only; no billing, customer or preference data changes.
alter table public.push_sends drop constraint push_sends_category_check;
alter table public.push_sends add constraint push_sends_category_check check (category in ('sales','invoices','general'));
alter table public.customer_notifications drop constraint customer_notifications_category_check;
alter table public.customer_notifications add constraint customer_notifications_category_check check (category in ('sales','invoices','general'));

create or replace function public.push_confirm_inbox(p_send uuid, p_actor uuid, p_recipients jsonb)
returns void language plpgsql set search_path = public as $$
declare s public.push_sends; r jsonb; c uuid; reserved uuid[]; sub uuid; consent boolean; delivery text;
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
  delivery := case when s.message ? 'delivery' then s.message->>'delivery' else 'in_app_push' end;
  if delivery is null or delivery not in ('in_app_only','in_app_push') then raise exception 'Invalid delivery mode'; end if;
  if s.category='general' and delivery <> 'in_app_only' then raise exception 'General updates are in-app only'; end if;
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
    if delivery='in_app_only' then continue; end if;
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

-- Defense in depth: even an older RPC must not enqueue inbox-only/general sends.
create function public.push_guard_delivery_mode() returns trigger language plpgsql set search_path=public as $$
declare s public.push_sends;
begin
  select * into s from public.push_sends where id=new.send_id;
  if s.category='general' or (s.message ? 'delivery' and (s.message->>'delivery' is distinct from 'in_app_push')) then
    raise exception 'This notification does not permit phone delivery';
  end if;
  return new;
end $$;
revoke all on function public.push_guard_delivery_mode() from public,anon,authenticated;
create trigger push_delivery_mode_guard before insert or update of send_id on public.push_deliveries
for each row execute function public.push_guard_delivery_mode();
