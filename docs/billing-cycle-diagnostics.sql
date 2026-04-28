-- Review customers who currently have more than one active balance cycle.
select
  customer_id,
  count(*) as active_cycle_count,
  min(due_date) as oldest_due_date,
  max(due_date) as newest_due_date
from balance_cycles
where status = 'active'
group by customer_id
having count(*) > 1
order by active_cycle_count desc, oldest_due_date asc;

-- Review active cycles that appear fully settled and are candidates for manual cleanup.
select
  bc.id as cycle_id,
  bc.customer_id,
  bc.due_date,
  bc.shipping_total,
  bc.adjustments_total,
  bc.payments_applied,
  bc.credits_applied,
  coalesce(sum(bli.quantity * bli.unit_price), 0) as subtotal,
  coalesce(sum(bli.quantity * bli.unit_price), 0)
    + coalesce(bc.shipping_total, 0)
    + coalesce(bc.adjustments_total, 0)
    - coalesce(bc.payments_applied, 0)
    - coalesce(bc.credits_applied, 0) as effective_due
from balance_cycles bc
left join balance_line_items bli on bli.cycle_id = bc.id
where bc.status = 'active'
group by
  bc.id,
  bc.customer_id,
  bc.due_date,
  bc.shipping_total,
  bc.adjustments_total,
  bc.payments_applied,
  bc.credits_applied
having
  coalesce(sum(bli.quantity * bli.unit_price), 0)
    + coalesce(bc.shipping_total, 0)
    + coalesce(bc.adjustments_total, 0)
    - coalesce(bc.payments_applied, 0)
    - coalesce(bc.credits_applied, 0) <= 0
order by bc.due_date asc, bc.customer_id asc;

-- Manual review only:
-- Do not bulk-archive from this query file.
-- Inspect any returned rows customer by customer before making live changes.
