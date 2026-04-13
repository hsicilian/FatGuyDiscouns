alter table public.payments
add column if not exists applied_amount numeric(12,2) not null default 0;

alter table public.payments
add column if not exists overpayment_amount numeric(12,2) not null default 0;

update public.payments
set
  applied_amount = coalesce(nullif(applied_amount, 0), amount),
  overpayment_amount = coalesce(overpayment_amount, 0)
where applied_amount = 0
   or applied_amount is null
   or overpayment_amount is null;
