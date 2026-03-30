# Post-Deploy Live Validation Checklist

Use this checklist after the Railway deployment is live and connected to the real Supabase project.

## 1. Environment Variables

- Check: Confirm Railway has `NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PRODUCT_IMAGES_BUCKET`, and `RAILWAY_PUBLIC_DOMAIN` set.
  Expected result: All required values are present, point to the production domain/project, and the deployment restarted successfully after the last env update.

## 2. Supabase Migration Success

- Check: Confirm all SQL migrations through `0005_production_hardening.sql` ran successfully in Supabase.
  Expected result: No failed migrations, required tables exist, RLS is enabled, and the `product-images` bucket/policies exist.

## 3. Health Endpoint

- Check: Open `/api/health` on the production site.
  Expected result: HTTP `200` with `ok: true` and `mode: "supabase"`.

## 4. Master Admin Bootstrap

- Check: Promote the owner account to `master_admin` with the documented SQL if not already done.
  Expected result: Owner can access `/admin/reports` and can promote other users to admin.

## 5. Signup

- Check: Create a brand-new customer account from `/signup`.
  Expected result: Signup succeeds, the user is created in Supabase Auth, and a matching pending customer record appears in the admin approval flow.

## 6. Email Verification

- Check: Open the signup verification email and complete the verification link.
  Expected result: The link lands on `/auth/callback`, the session is created correctly, and the user can proceed to sign in.

## 7. Password Reset

- Check: Use `/forgot-password`, open the reset email, complete the reset flow, and submit a new password on `/reset-password`.
  Expected result: Reset email is delivered, callback route works, password updates successfully, and the user can log in with the new password.

## 8. Login / Logout

- Check: Sign in with a verified customer account, then sign out.
  Expected result: Login creates the correct session and route access, and logout clears the session cleanly.

## 9. Customer Approval

- Check: Sign in as admin and approve the newly created customer account.
  Expected result: Customer moves from `pending_approval` to `approved`, and claiming becomes available for that account.

## 10. Customer Permissions

- Check: While signed in as a customer, open account, history, claims, and event pages. Try to access another customer's data indirectly.
  Expected result: The customer only sees their own profile, balances, claims, shipments, and invoices.

## 11. Claiming Items

- Check: As an approved customer, claim an in-stock item from the storefront.
  Expected result: Claim succeeds, the item is added to the active running balance, and the customer cannot remove it themselves afterward.

## 12. Inventory Reduction

- Check: Compare inventory before and after the claim in the storefront and admin inventory view.
  Expected result: Inventory decreases immediately and stays in sync across customer/admin views.

## 13. Low-Stock Alerts

- Check: Claim or adjust inventory so a product reaches quantity `1`.
  Expected result: Product status becomes `low_stock` and a low-stock admin notification appears.

## 14. Out-of-Stock Behavior

- Check: Claim or adjust inventory so a product reaches quantity `0`, then refresh the storefront.
  Expected result: Product remains visible as out of stock, cannot be claimed, and still shows the restock request option.

## 15. Restock Request

- Check: On an out-of-stock product, submit `Can you get more?`
  Expected result: Restock request is stored and visible to admins through notifications/workflow.

## 16. Running Balance Updates

- Check: Review the customer dashboard immediately after a claim.
  Expected result: Active balance subtotal and claimed items update correctly in the current balance cycle.

## 17. Due Date / Overdue Behavior

- Check: Confirm the active cycle due date is shown. If possible, use test data with a past-due cycle.
  Expected result: Due date displays correctly, and overdue accounts show an overdue warning.

## 18. Payment Application

- Check: As admin, apply a payment to the customer's active balance.
  Expected result: Payment is recorded, remaining balance updates correctly, and the payment appears in the cycle math.

## 19. Credit Handling

- Check: Apply a payment large enough to create an overpayment, or apply existing credit to a balance.
  Expected result: Overpayment becomes customer credit, credit reduces the balance correctly, and totals stay accurate.

## 20. Invoice Archive Flow

- Check: Pay a balance cycle in full.
  Expected result: Current cycle is archived into invoice history and a fresh active cycle is created for future claims.

## 21. Shipment Request Flow

- Check: As customer, request shipment and confirm the address checkbox first.
  Expected result: Request is blocked without confirmation, succeeds with confirmation, and appears in admin shipment workflows/notifications.

## 22. Tracking Number Flow

- Check: As admin, update a shipment with `in_progress` or `completed` status and add a tracking number.
  Expected result: Shipment status and tracking persist, and last shipment date updates for the customer when completed.

## 23. Image Upload

- Check: Upload a product image through the admin product-image flow or API path.
  Expected result: File is stored in Supabase Storage, a `product_images` row is created, and the image remains accessible after refresh.

## 24. Calendar / Event Display

- Check: View events while logged out, then while logged in as a customer with a saved timezone.
  Expected result: Guests see ET/EST behavior, and signed-in customers see times rendered in their saved timezone.

## 25. Admin Permissions

- Check: Sign in as a regular admin and open approvals, inventory, claims, customers, payments, and shipments.
  Expected result: Admin can use operational tools but cannot access master-admin-only reporting.

## 26. Master-Admin-Only Reporting

- Check: Sign in as master admin and open `/admin/reports`.
  Expected result: Reporting is visible to master admin only, and regular admins are blocked from it.

## 27. Backup / Export Readiness

- Check: Confirm you know how to export the Supabase database and storage assets before launch.
  Expected result: A clear backup path exists for database export/dump and product image storage export if needed.

## 28. Launch-Day Smoke Test

- Check: Run one fast end-to-end pass in this order: health endpoint, signup, verify, login, admin approval, claim, balance update, shipment request, payment application, admin report access.
  Expected result: All critical business flows succeed without errors, and no production route falls back to local JSON behavior.
