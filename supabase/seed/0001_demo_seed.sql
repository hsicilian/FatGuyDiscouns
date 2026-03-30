insert into public.categories (id, name, slug)
values
  ('11111111-1111-1111-1111-111111111111', 'Outerwear', 'outerwear'),
  ('22222222-2222-2222-2222-222222222222', 'Tees', 'tees'),
  ('33333333-3333-3333-3333-333333333333', 'Flannels', 'flannels')
on conflict do nothing;

insert into public.products (id, title, description, price, category_id, sku, location, inventory_quantity, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vintage denim jacket', 'Live-sale featured outerwear item.', 28, '11111111-1111-1111-1111-111111111111', 'FGD-JKT-001', 'Rack A1', 2, 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Bundle lot tee', 'Single-quantity live claim item.', 12, '22222222-2222-2222-2222-222222222222', 'FGD-TEE-002', 'Rack B3', 1, 'low_stock'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Retro flannel', 'Held visible after sellout for restock requests.', 18, '33333333-3333-3333-3333-333333333333', 'FGD-FLN-003', 'Rack C2', 0, 'out_of_stock')
on conflict do nothing;

insert into public.events (id, title, starts_at, description, external_link, platform)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Sunday claim show', '2026-03-29T19:30:00-04:00', 'Main weekly sale with outerwear, denim, and bundle claims.', 'https://example.com/live/sunday-claim-show', 'Facebook Live'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Midweek clearance drop', '2026-04-01T20:00:00-04:00', 'Quick-hit clearance stream focused on low inventory closeouts.', 'https://example.com/live/midweek-clearance-drop', 'Instagram Live')
on conflict do nothing;

