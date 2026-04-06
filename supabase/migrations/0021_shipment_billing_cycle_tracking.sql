alter table public.shipments
add column if not exists billing_cycle_id uuid references public.balance_cycles(id) on delete set null;
