# RLS outline

## Public access

- `products`: public select for `active`, `low_stock`, and `out_of_stock` rows intended for storefront visibility.
- `product_images`: public select when parent product is publicly visible.
- `categories`: public select.
- `events`: public select.

## Customer access

- `customer_profiles`: select/update where `auth.uid() = user_id`.
- `addresses`: select/update where `auth.uid() = user_id`.
- `balance_cycles`: select where `customer_id = auth.uid()`.
- `balance_line_items`: select through owned cycle.
- `payments`: select through owned cycle.
- `credits`: select where `customer_id = auth.uid()`.
- `shipments`: select where `customer_id = auth.uid()`.

## Admin access

- admins and master admins can read/write `products`, `product_images`, `categories`, `shipments`, `notifications`, `customer_notes`, and operational customer records.
- admins can update `user_roles.account_state` but not promote to admin.

## Master admin access

- everything admins can do
- reporting views and cross-customer financial aggregation
- promote users into admin roles

## Implementation note

Use helper SQL functions or JWT claims to check whether the current user is `admin` or `master_admin`, with `user_roles` as the canonical source.

