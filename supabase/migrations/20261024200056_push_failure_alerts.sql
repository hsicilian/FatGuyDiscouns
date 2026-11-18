-- Local only. Durable alerts; no historical backfill or delivery jobs.
alter type public.notification_type add value if not exists 'push_failure';
alter table public.customer_notifications add column kind text not null default 'message' check (kind in ('message','push_failure'));
alter table public.customer_notifications drop constraint customer_notifications_send_id_customer_id_key;
alter table public.customer_notifications add constraint customer_notifications_send_customer_kind_key unique(send_id,customer_id,kind);

create table public.push_failure_alerts (
 id uuid primary key default gen_random_uuid(),
 send_id uuid not null references public.push_sends(id),
 customer_id uuid not null references auth.users(id),
 kind text not null check (kind in ('invalid','configuration')),
 failed_count integer not null default 0,
 remaining_devices integer not null default 0,
 provider_statuses integer[] not null default '{}',
 first_failed_at timestamptz not null default now(),
 last_failed_at timestamptz not null default now(),
 admin_notification_id uuid not null,
 unique(send_id,customer_id,kind)
);
create table public.push_subscription_events (
 id uuid primary key default gen_random_uuid(),
 subscription_id uuid not null references public.push_subscriptions(id),
 delivery_id uuid unique references public.push_deliveries(id),
 alert_id uuid references public.push_failure_alerts(id),
 kind text not null check(kind in ('invalid','recovered','registered','configuration')),
 http_status integer,
 occurred_at timestamptz not null default now()
);
alter table public.push_failure_alerts enable row level security;
alter table public.push_subscription_events enable row level security;
revoke all on public.push_failure_alerts,public.push_subscription_events from public,anon,authenticated;
grant select,insert,update on public.push_failure_alerts,public.push_subscription_events to service_role;

-- Trigger-only SECURITY DEFINER reads Auth email for an internal admin alert.
-- No public execution; all writable source tables already deny browser roles.
create function public.push_record_failure() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare sub public.push_subscriptions; a public.push_failure_alerts; k text; who text; mail text;
 n integer; remain integer; codes integer[]; aid uuid; body text; heading text; customer boolean; target uuid;
begin
 if old.status <> 'sending' or new.status not in ('expired','failed') then return new; end if;
 if new.status='expired' and new.http_status in (404,410) then k:='invalid';
 elsif new.status='failed' and new.http_status in (401,403) then k:='configuration';
 else return new; end if;
 -- Serialize aggregation for this send, including concurrent batches.
 perform 1 from public.push_sends where id=new.send_id for update;
 select * into sub from public.push_subscriptions where id=new.subscription_id for update;
 if not sub.active or sub.user_id <> new.customer_id then return new; end if;
 if exists(select 1 from public.push_subscription_events where delivery_id=new.id) then return new; end if;
 if k='invalid' then update public.push_subscriptions set active=false,updated_at=now() where id=sub.id; end if;
 -- Configuration failures aggregate once per send, independent of audience size.
 target:=case when k='configuration' then (select actor_id from public.push_sends where id=new.send_id) else sub.user_id end;
 select * into a from public.push_failure_alerts where send_id=new.send_id and customer_id=target and kind=k for update;
 select coalesce(p.display_name,u.email,'Customer'),coalesce(u.email,'Email unavailable') into who,mail
 from auth.users u left join public.customer_profiles p on p.user_id=u.id where u.id=sub.user_id;
 select exists(select 1 from public.user_roles where user_id=sub.user_id and role='customer') into customer;
 n:=coalesce(a.failed_count,0)+1;
 select count(*) into remain from public.push_subscriptions where user_id=sub.user_id and active and (expires_at is null or expires_at>now());
 select array_agg(distinct v order by v) into codes from unnest(coalesce(a.provider_statuses,'{}')||array[new.http_status]) v;
 if k='invalid' then
   heading:='FGD phone notification failure — '||who;
   body:='Push delivery failed because a registered device subscription became invalid. Customer: '||who||' ('||mail||'). Failed subscriptions in this send: '||n||'. Other active registered devices: '||remain||'. Provider HTTP: '||array_to_string(codes,', ')||'. Latest failure (UTC): '||to_char(now() at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')||'. ';
   if customer then body:=body||'Customer notification has been recorded. '; end if;
   body:=body||'Customer follow-up may be required.';
 else
   heading:='FGD push configuration requires attention';
   body:='Push provider authentication/configuration rejection. HTTP: '||array_to_string(codes,', ')||'. Failed device requests in this send: '||n||'. Latest failure (UTC): '||to_char(now() at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')||'. Subscriptions and customer preferences have not been disabled. Review VAPID/provider configuration before another send.';
 end if;
 aid:=coalesce(a.admin_notification_id,gen_random_uuid());
 insert into public.notifications(id,type,customer_id,payload) values(aid,'push_failure',case when k='invalid' then sub.user_id else null end,jsonb_build_object('label',heading||'. '||body,'push_failure',true))
 on conflict(id) do update set payload=excluded.payload;
 insert into public.push_failure_alerts(send_id,customer_id,kind,failed_count,remaining_devices,provider_statuses,admin_notification_id)
 values(new.send_id,target,k,n,remain,codes,aid)
 on conflict(send_id,customer_id,kind) do update set failed_count=excluded.failed_count,remaining_devices=excluded.remaining_devices,provider_statuses=excluded.provider_statuses,last_failed_at=now()
 returning * into a;
 insert into public.push_subscription_events(subscription_id,delivery_id,alert_id,kind,http_status) values(sub.id,new.id,a.id,case when k='invalid' then 'invalid' else 'configuration' end,new.http_status);
 if k='invalid' and customer then
   body:='One of your phones is no longer registered to receive FGD sale announcements and payment reminders. Open FGD on that phone and select Turn on phone notifications to restore them. '||case when remain=0 then 'No active registered devices remain; phone notifications are currently unavailable for your account.' else remain||' other registered device(s) remain active. This does not confirm receipt of alerts on those devices.' end;
   insert into public.customer_notifications(customer_id,send_id,title,body,category,kind)
   values(sub.user_id,new.send_id,'Phone notifications stopped working',body,'general','push_failure')
   on conflict(send_id,customer_id,kind) do update set body=excluded.body;
   -- Deliberately never reset deleted_at, even when a later failure is grouped.
 end if;
 return new;
end $$;
revoke all on function public.push_record_failure() from public,anon,authenticated;
create trigger push_delivery_failure after update of status on public.push_deliveries for each row execute function public.push_record_failure();

create function public.push_record_recovery() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='INSERT' then
   insert into public.push_subscription_events(subscription_id,kind) values(new.id,'registered');
 elsif not old.active and new.active then
   insert into public.push_subscription_events(subscription_id,kind) values(new.id,'recovered');
 end if;
 return new;
end $$;
revoke all on function public.push_record_recovery() from public,anon,authenticated;
create trigger push_subscription_recovery after insert or update of active on public.push_subscriptions for each row execute function public.push_record_recovery();

