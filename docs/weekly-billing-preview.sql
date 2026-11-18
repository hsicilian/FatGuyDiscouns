-- Read-only preview. Run immediately before migration 0025 in Supabase.
with billing_day as (
  select (now() at time zone 'America/New_York')::date as today
), schedule as (
  select today, today + ((7 - extract(dow from today)::integer) % 7) as sunday
  from billing_day
)
select bc.id as cycle_id, bc.customer_id, bc.due_date as old_due_date,
       s.sunday as new_due_date, bc.status,
       bc.shipping_total, bc.adjustments_total, bc.payments_applied, bc.credits_applied
from public.balance_cycles bc cross join schedule s
where bc.status = 'active' and bc.due_date >= s.today and bc.due_date <> s.sunday
  and not exists (select 1 from public.archived_invoices ai where ai.cycle_id = bc.id)
order by bc.customer_id, bc.due_date;

-- Missing dates or invoice-linked active cycles are excluded from conversion.
-- Review these anomalies separately; do not rewrite history to normalize them.
select bc.id, bc.customer_id, bc.status, bc.due_date
from public.balance_cycles bc
where bc.status = 'active' and (
  bc.due_date is null or exists (
    select 1 from public.archived_invoices ai where ai.cycle_id = bc.id
  )
);
