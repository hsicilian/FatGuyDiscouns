alter table public.cross_listed_inventory
add column if not exists platform_dates jsonb not null default '{}'::jsonb;

update public.cross_listed_inventory
set platform_dates = coalesce(
  (
    select jsonb_object_agg(platform_name, coalesce(created_at::date::text, now()::date::text))
    from unnest(platforms) as platform_name
  ),
  '{}'::jsonb
)
where coalesce(jsonb_object_length(platform_dates), 0) = 0;
