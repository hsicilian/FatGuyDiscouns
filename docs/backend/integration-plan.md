# Backend integration plan

## Immediate server action targets

- `submitClaim(productId, requestedQuantity)`
  Validate customer approval state, lock inventory safely, insert balance line item, add notification, and update product status.
- `updateApprovalState(nextState)`
  Confirm admin role, update `user_roles.account_state`, and create approval-related audit/notification records.
- `submitShipmentRequest()`
  Confirm approved customer and valid address, create or update shipment row, and create an admin notification.

## Transaction boundaries

### Claim flow

1. Read active balance cycle for the customer.
2. Lock product row or perform an atomic `inventory_quantity >= requestedQuantity` update.
3. Insert claim line item into `balance_line_items`.
4. Decrement inventory.
5. Derive and persist next product status.
6. Insert `new_claim` notification.

### Payment / archive flow

1. Apply payment row.
2. Recompute cycle total.
3. If fully paid, archive invoice snapshot.
4. Create new active cycle for future claims.

### Shipment flow

1. Confirm address.
2. Create shipment request or update shipment row.
3. Add admin notification.
4. When complete, persist tracking number, ship date, and customer `last_shipment_date`.

## Row-level security direction

- Customers can read only their own profile, addresses, active cycle, invoice history, shipments, and notifications intended for them.
- Customers cannot directly update products, payments, credits, or admin notes.
- Admins can read/write operational tables except master-admin-only reporting and role promotion logic.
- Master admins can read all reporting views and manage role promotion.
- Product browsing and events should be public-read for active/visible records.

## Realtime priorities

- Product inventory/status changes
- Admin notifications
- Pending approval queue counts
- Shipment request queue changes

