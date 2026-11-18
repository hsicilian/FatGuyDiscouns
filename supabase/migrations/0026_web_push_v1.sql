-- Additive Web Push V1 only. Apply separately after review; no billing changes.
create table public.push_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sales boolean not null default false,
  invoices boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) <= 2048),
  p256dh text not null,
  auth text not null,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions(user_id);
create table public.push_sends (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  category text not null check (category in ('sales','invoices')),
  message jsonb not null,
  test_only boolean not null default false,
  status text not null default 'draft' check (status in ('draft','queued')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create table public.push_reminder_cycles (
  customer_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null,
  send_id uuid not null references public.push_sends(id),
  primary key (customer_id, cycle_id)
);
create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  send_id uuid not null references public.push_sends(id),
  subscription_id uuid not null references public.push_subscriptions(id),
  customer_id uuid not null references auth.users(id) on delete cascade,
  cycle_ids uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','sending','retry','accepted','expired','failed','unknown','skipped')),
  attempts integer not null default 0,
  http_status integer,
  ready_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (send_id, subscription_id)
);
create index push_delivery_queue on public.push_deliveries(send_id, status, ready_at);

-- All access goes through authenticated server handlers. No direct browser access,
-- including endpoints/encryption keys. Service role never reaches the browser.
alter table public.push_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_sends enable row level security;
alter table public.push_reminder_cycles enable row level security;
alter table public.push_deliveries enable row level security;
revoke all on public.push_preferences, public.push_subscriptions, public.push_sends,
  public.push_reminder_cycles, public.push_deliveries from anon, authenticated;
grant all on public.push_preferences, public.push_subscriptions, public.push_sends,
  public.push_reminder_cycles, public.push_deliveries to service_role;

-- Called only with freshly selected authoritative billing results. One transaction
-- reserves cycles and queues devices; repeated confirmation is idempotent.
create function public.push_confirm(p_send uuid, p_actor uuid, p_recipients jsonb)
returns void language plpgsql set search_path = public as $$
declare s public.push_sends; r jsonb; c uuid; reserved uuid[]; sub uuid;
begin
  select * into s from public.push_sends where id = p_send for update;
  if s.id is null or s.actor_id <> p_actor then raise exception 'Invalid send'; end if;
  if not exists (select 1 from public.user_roles where user_id=p_actor and role='master_admin' and account_state <> 'banned') then
    raise exception 'Owner access required';
  end if;
  if s.status <> 'draft' then return; end if;
  if s.created_at < now() - interval '30 minutes' then raise exception 'Preview expired'; end if;
  for r in select value from jsonb_array_elements(p_recipients) order by value->>'userId' loop
    if s.test_only then
      if (r->>'userId')::uuid <> p_actor then raise exception 'Tests target owner only'; end if;
    else
      if not exists (select 1 from public.user_roles u join public.push_preferences p on p.user_id=u.user_id
        where u.user_id=(r->>'userId')::uuid and u.role='customer' and u.account_state <> 'banned'
        and case when s.category='sales' then p.sales else p.invoices end) then continue; end if;
    end if;
    if not exists (select 1 from public.push_subscriptions
      where user_id=(r->>'userId')::uuid and active and (expires_at is null or expires_at > now())
      and id in (select value::uuid from jsonb_array_elements_text(r->'subscriptionIds'))) then continue; end if;
    reserved := '{}';
    if s.category = 'invoices' and not s.test_only then
      for c in select value::uuid from jsonb_array_elements_text(r->'cycleIds') order by value loop
        insert into public.push_reminder_cycles(customer_id,cycle_id,send_id)
          values ((r->>'userId')::uuid,c,p_send) on conflict do nothing;
        if found then reserved := array_append(reserved,c); end if;
      end loop;
      if cardinality(reserved) = 0 then continue; end if;
    end if;
    for sub in select value::uuid from jsonb_array_elements_text(r->'subscriptionIds') loop
      insert into public.push_deliveries(send_id,subscription_id,customer_id,cycle_ids)
      select p_send,id,user_id,reserved from public.push_subscriptions
        where id=sub and user_id=(r->>'userId')::uuid and active and (expires_at is null or expires_at > now())
      on conflict do nothing;
    end loop;
  end loop;
  update public.push_sends set status='queued', confirmed_at=now() where id=p_send;
end $$;

create function public.push_claim(p_send uuid)
returns setof public.push_deliveries language plpgsql set search_path = public as $$
begin
  -- Never resend an interrupted/ambiguous request automatically.
  update public.push_deliveries set status='unknown', updated_at=now()
    where send_id=p_send and status='sending' and updated_at < now()-interval '5 minutes';
  return query
    update public.push_deliveries d set status='sending', attempts=d.attempts+1, updated_at=now()
    where d.id in (select id from public.push_deliveries where send_id=p_send
      and status in ('pending','retry') and ready_at <= now() and attempts < 3
      order by ready_at,id for update skip locked limit 1)
    returning d.*;
end $$;
revoke all on function public.push_confirm(uuid,uuid,jsonb), public.push_claim(uuid) from public, anon, authenticated;
grant execute on function public.push_confirm(uuid,uuid,jsonb), public.push_claim(uuid) to service_role;
