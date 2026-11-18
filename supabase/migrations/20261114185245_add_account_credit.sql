-- Additive: no historical backfill or changes to billing cycles.
create table public.account_credit_requests (
 id uuid primary key,
 actor_id uuid not null references auth.users(id),
 customer_id uuid not null references auth.users(id),
 amount numeric(12,2) not null check(amount > 0),
 reason text not null,
 recorded_on date not null,
 created_at timestamptz not null default now()
);
alter table public.account_credit_requests enable row level security;
revoke all on public.account_credit_requests from public, anon, authenticated;
grant select, insert on public.account_credit_requests to service_role;

create function public.add_account_credit(p_request uuid, p_actor uuid, p_customer uuid,
 p_amount numeric, p_reason text, p_recorded_on date)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare previous public.account_credit_requests; credit_now numeric; actor_name text;
begin
 if not exists(select 1 from public.user_roles where user_id=p_actor and role='master_admin' and account_state <> 'banned') then
  raise exception 'Owner access required';
 end if;
 if p_request is null or p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount <= 0 or p_amount > 9999999999.99 or round(p_amount,2) <> p_amount
 or p_reason is null or length(btrim(p_reason)) not between 1 and 300 or p_recorded_on is null then
  raise exception 'Invalid credit details';
 end if;
 -- Same submission is serialized before examining its immutable receipt.
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.account_credit_requests where id=p_request;
 if found then
  if previous.actor_id <> p_actor or previous.customer_id <> p_customer or previous.amount <> p_amount or previous.reason <> btrim(p_reason) or previous.recorded_on <> p_recorded_on then
   raise exception 'This submission was already used with different credit details';
  end if;
  return jsonb_build_object('saved',true,'duplicate',true);
 end if;
 if not exists(select 1 from public.user_roles where user_id=p_customer and role='customer') then raise exception 'Customer not found'; end if;
 select credit_balance into credit_now from public.customer_profiles where user_id=p_customer for update;
 if not found then raise exception 'Customer profile not found'; end if;
 insert into public.account_credit_requests(id,actor_id,customer_id,amount,reason,recorded_on)
 values(p_request,p_actor,p_customer,p_amount,btrim(p_reason),p_recorded_on);
 insert into public.credits(id,customer_id,amount,reason,created_at)
 values(p_request,p_customer,p_amount,btrim(p_reason),(p_recorded_on::timestamp + interval '12 hours') at time zone 'UTC');
 update public.customer_profiles set credit_balance=credit_balance+p_amount where user_id=p_customer;
 select display_name into actor_name from public.customer_profiles where user_id=p_actor;
 insert into public.admin_audit_log(actor_id,actor_name,actor_role,action_type,entity_type,entity_id,target_customer_id,summary)
 values(p_actor,coalesce(actor_name,'Owner'),'master_admin','credit.add','credit',p_request::text,p_customer,
 'Added account credit $'||p_amount::text||': '||btrim(p_reason));
 return jsonb_build_object('saved',true,'duplicate',false);
end $$;
revoke all on function public.add_account_credit(uuid,uuid,uuid,numeric,text,date) from public,anon,authenticated;
grant execute on function public.add_account_credit(uuid,uuid,uuid,numeric,text,date) to service_role;
