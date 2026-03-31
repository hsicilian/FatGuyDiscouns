import "server-only";

import { applyPaymentToBalance, canRequestShipment, nextShipmentStatus, shouldArchiveBalance, validateClaimAttempt } from "@fatguydiscounts/core";
import type { AccountState, ShipmentStatus } from "@fatguydiscounts/types";
import {
  ensureActiveCycle,
  formatCycleLabel,
  getAdminClient,
  getCurrentActor,
  getCustomerSummaryByUserId,
  getTargetCycleContext,
  nextDueDateFromToday,
  siteToday,
} from "./supabase-helpers";
import { getCurrentCustomerSupabase, listProductsSupabase } from "./supabase-reads";
import { createServerSupabaseClient } from "../supabase";

export async function submitClaimToDatabaseSupabase(productId: string, requestedQuantity: number) {
  const customer = await getCurrentCustomerSupabase();
  const products = await listProductsSupabase();
  const product = products.find((entry) => entry.id === productId);
  if (!product) return { ok: false, message: "Product not found." };

  const preview = validateClaimAttempt({
    role: customer.role,
    accountState: customer.accountState,
    availableQuantity: product.quantity,
    requestedQuantity,
  });
  if (!preview.ok) return preview;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("app_claim_product", { p_product_id: productId, p_quantity: requestedQuantity });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `${product.title} has been added to the active running balance.` };
}

export async function adjustInventoryInDatabaseSupabase(productId: string, quantityChange: number) {
  const admin = await getAdminClient();
  const { data: product, error } = await admin.from("products").select("id, title, inventory_quantity").eq("id", productId).single();
  if (error || !product) return { ok: false, message: "Product not found." };

  const nextQuantity = Number(product.inventory_quantity ?? 0) + quantityChange;
  if (nextQuantity < 0) return { ok: false, message: "Inventory cannot go below zero." };

  const updateResult = await admin.from("products").update({ inventory_quantity: nextQuantity, updated_at: new Date().toISOString() }).eq("id", productId);
  if (updateResult.error) return { ok: false, message: updateResult.error.message };

  if (nextQuantity === 1) {
    await admin.from("notifications").insert({ type: "low_stock", product_id: productId, payload: { label: `${product.title} reached low stock.` } });
  }

  return { ok: true, message: `${product.title} inventory updated to ${nextQuantity}.` };
}

export async function submitRestockRequestToDatabaseSupabase(productId: string) {
  const actor = await getCurrentActor().catch(() => null);
  const admin = await getAdminClient();
  const { data: product, error } = await admin.from("products").select("id, title").eq("id", productId).single();
  if (error || !product) return { ok: false, message: "Product not found." };

  let existingQuery = admin.from("restock_requests").select("id").eq("product_id", productId).eq("status", "open");
  existingQuery = actor?.role === "customer" ? existingQuery.eq("customer_id", actor.id) : existingQuery.is("customer_id", null);
  const existing = await existingQuery.maybeSingle();
  if (existing.data) return { ok: true, message: "A restock request for this item is already in the admin queue." };

  await admin.from("restock_requests").insert({
    product_id: productId,
    customer_id: actor?.role === "customer" ? actor.id : null,
    email: actor?.email ?? null,
    status: "open",
  });
  await admin.from("notifications").insert({ type: "restock_request", product_id: productId, customer_id: actor?.role === "customer" ? actor.id : null, payload: { label: `Restock request received for ${product.title}.` } });
  return { ok: true, message: "The admin team has been asked about getting more of this item." };
}

export async function submitShipmentRequestToDatabaseSupabase() {
  const actor = await getCurrentActor();
  const customer = await getCurrentCustomerSupabase();
  const allowed = canRequestShipment(customer.accountState, customer.shipmentStatus);
  if (!allowed) return { ok: false, message: "Shipment request is blocked for this account." };

  const cycle = await ensureActiveCycle(actor.id);
  const admin = await getAdminClient();
  const { data: address } = await admin.from("addresses").select("id").eq("user_id", actor.id).eq("is_default", true).maybeSingle();
  const nextStatus = nextShipmentStatus(customer.shipmentStatus, "request");

  const { error } = await admin.from("shipments").insert({ cycle_id: cycle.id, customer_id: actor.id, address_id: address?.id ?? null, address_confirmed: true, status: nextStatus, requested_at: new Date().toISOString() });
  if (error) return { ok: false, message: error.message };

  await admin.from("notifications").insert({ type: "shipment_request", customer_id: actor.id, payload: { label: `${customer.displayName} requested shipment confirmation.` } });
  return { ok: true, message: "Shipment request submitted for admin review.", nextStatus };
}

export async function updateShipmentInDatabaseSupabase(shipmentId: string, nextStatus: ShipmentStatus, trackingNumber: string) {
  const admin = await getAdminClient();
  const { data: shipment, error } = await admin.from("shipments").select("id, customer_id").eq("id", shipmentId).single();
  if (error || !shipment) return { ok: false, message: "Shipment record not found." };

  const shipmentDate = nextStatus === "completed" ? siteToday() : null;
  const updateResult = await admin.from("shipments").update({ status: nextStatus, tracking_number: trackingNumber.trim() || null, shipment_date: shipmentDate, completed_at: nextStatus === "completed" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", shipmentId);
  if (updateResult.error) return { ok: false, message: updateResult.error.message };

  if (shipmentDate) {
    await admin.from("customer_profiles").update({ last_shipment_date: shipmentDate }).eq("user_id", shipment.customer_id);
  }

  const customer = await getCustomerSummaryByUserId(shipment.customer_id, { admin: true });
  return { ok: true, message: `${customer.displayName} shipment updated to ${nextStatus.replaceAll("_", " ")}.`, nextStatus };
}

export async function updateCustomerAccountStateSupabase(customerId: string, nextState: AccountState) {
  const admin = await getAdminClient();
  const timestamp = new Date().toISOString();
  const { data: existingRoleRow, error: existingRoleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", customerId)
    .maybeSingle();

  if (existingRoleError) {
    return { ok: false, message: existingRoleError.message };
  }

  const { data: savedRoleRow, error } = await admin
    .from("user_roles")
    .upsert({
      user_id: customerId,
      role: existingRoleRow?.role ?? "customer",
      account_state: nextState,
      approved_at: nextState === "approved" ? timestamp : null,
      updated_at: timestamp,
    }, { onConflict: "user_id" })
    .select("user_id, account_state")
    .single();

  if (error) return { ok: false, message: error.message };
  if (savedRoleRow.account_state !== nextState) {
    return { ok: false, message: "Customer approval state did not save correctly." };
  }

  const customer = await getCustomerSummaryByUserId(customerId, { admin: true });
  await admin.from("notifications").insert({ type: "pending_approval", customer_id: customerId, payload: { label: `${customer.displayName} was updated to ${nextState.replaceAll("_", " ")}.` } });
  return { ok: true, message: `${customer.displayName} is now ${nextState.replaceAll("_", " ")}.`, nextStatus: nextState };
}

export async function updateCustomerRoleInDatabaseSupabase(customerId: string, nextRole: "admin") {
  const admin = await getAdminClient();
  const { error } = await admin.from("user_roles").update({ role: nextRole, account_state: "approved", approved_at: new Date().toISOString() }).eq("user_id", customerId);
  if (error) return { ok: false, message: error.message };

  const customer = await getCustomerSummaryByUserId(customerId, { admin: true });
  await admin.from("notifications").insert({ type: "pending_approval", customer_id: customerId, payload: { label: `${customer.displayName} was promoted to ${nextRole.replaceAll("_", " ")}.` } });
  return { ok: true, message: `${customer.displayName} is now an ${nextRole.replaceAll("_", " ")}.` };
}

export async function addCustomerNoteToDatabaseSupabase(customerId: string, note: string) {
  const actor = await getCurrentActor();
  const trimmedNote = note.trim();
  if (!trimmedNote) return { ok: false, message: "Enter a note before saving." };

  const admin = await getAdminClient();
  const { error } = await admin.from("customer_notes").insert({ customer_id: customerId, body: trimmedNote, created_by: actor.id });
  if (error) return { ok: false, message: error.message };

  const customer = await getCustomerSummaryByUserId(customerId, { admin: true });
  return { ok: true, message: `Saved an internal note for ${customer.displayName}.` };
}

export async function addManualBalanceItemToDatabaseSupabase(title: string, quantity: number, unitPrice: number) {
  const actor = await getCurrentActor();
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { ok: false, message: "Enter an item title." };
  if (quantity < 1 || unitPrice < 0) return { ok: false, message: "Quantity must be at least 1 and price cannot be negative." };

  const context = await getTargetCycleContext();
  if (!context) return { ok: false, message: "No active balance cycle is available for admin adjustments yet." };

  const admin = await getAdminClient();
  const { error } = await admin.from("balance_line_items").insert({ cycle_id: context.cycle.id, item_type: "manual_item", description: trimmedTitle, quantity, unit_price: unitPrice, status: "adjusted", created_by: actor.id });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `${trimmedTitle} was added to the active balance cycle.` };
}

export async function updateClaimedItemInDatabaseSupabase(claimId: string, quantity: number, unitPrice: number) {
  if (quantity < 1 || unitPrice < 0) return { ok: false, message: "Quantity must be at least 1 and price cannot be negative." };

  const admin = await getAdminClient();
  const { data: item, error } = await admin.from("balance_line_items").select("id, description, quantity, item_type, product_id").eq("id", claimId).single();
  if (error || !item) return { ok: false, message: "Claimed item not found." };

  if (item.item_type === "claim" && item.product_id) {
    const quantityDiff = Number(quantity) - Number(item.quantity ?? 0);
    if (quantityDiff !== 0) {
      const { data: product } = await admin.from("products").select("inventory_quantity").eq("id", item.product_id).single();
      const nextQuantity = Number(product?.inventory_quantity ?? 0) - quantityDiff;
      if (nextQuantity < 0) return { ok: false, message: "Inventory cannot go below zero." };
      await admin.from("products").update({ inventory_quantity: nextQuantity, updated_at: new Date().toISOString() }).eq("id", item.product_id);
    }
  }

  const updateResult = await admin.from("balance_line_items").update({ quantity, unit_price: unitPrice, updated_at: new Date().toISOString() }).eq("id", claimId);
  if (updateResult.error) return { ok: false, message: updateResult.error.message };
  return { ok: true, message: `${item.description} was updated.` };
}

export async function removeClaimedItemFromDatabaseSupabase(claimId: string) {
  const admin = await getAdminClient();
  const { data: item, error } = await admin.from("balance_line_items").select("id, description, quantity, item_type, product_id").eq("id", claimId).single();
  if (error || !item) return { ok: false, message: "Claimed item not found." };

  if (item.item_type === "claim" && item.product_id) {
    const { data: product } = await admin.from("products").select("inventory_quantity").eq("id", item.product_id).single();
    const nextQuantity = Number(product?.inventory_quantity ?? 0) + Number(item.quantity ?? 0);
    await admin.from("products").update({ inventory_quantity: nextQuantity, updated_at: new Date().toISOString() }).eq("id", item.product_id);
  }

  const removeResult = await admin.from("balance_line_items").delete().eq("id", claimId);
  if (removeResult.error) return { ok: false, message: removeResult.error.message };
  return { ok: true, message: `${item.description} was removed from the active balance.` };
}

export async function applyBalanceAdjustmentsToDatabaseSupabase(shippingChange: number, adjustmentChange: number) {
  const context = await getTargetCycleContext();
  if (!context) return { ok: false, message: "No active balance cycle is available for admin adjustments yet." };

  const nextShipping = Number(context.cycle.shipping_total ?? 0) + shippingChange;
  const nextAdjustments = Number(context.cycle.adjustments_total ?? 0) + adjustmentChange;
  if (nextShipping < 0) return { ok: false, message: "Shipping total cannot go below zero." };

  const admin = await getAdminClient();
  const { error } = await admin.from("balance_cycles").update({ shipping_total: nextShipping, adjustments_total: nextAdjustments, updated_at: new Date().toISOString() }).eq("id", context.cycle.id);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Balance charges were updated." };
}

export async function applyPaymentToDatabaseSupabase(paymentAmount: number, creditAmount: number) {
  const context = await getTargetCycleContext();
  if (!context) return { ok: false, message: "No active balance cycle is available for payment." };
  if (paymentAmount < 0 || creditAmount < 0) return { ok: false, message: "Payment and credit amounts must be zero or higher." };

  const customer = await getCustomerSummaryByUserId(context.cycle.customer_id, { admin: true });
  const due = context.summary.subtotal + context.summary.shipping + context.summary.adjustments - context.summary.paymentsApplied - context.summary.creditsApplied;
  const applicableCredit = Math.min(creditAmount, customer.creditBalance, Math.max(due - paymentAmount, 0));
  const preview = applyPaymentToBalance(due, paymentAmount, applicableCredit);
  const admin = await getAdminClient();

  const cycleUpdate = await admin.from("balance_cycles").update({ payments_applied: Number(context.cycle.payments_applied ?? 0) + paymentAmount, credits_applied: Number(context.cycle.credits_applied ?? 0) + applicableCredit, updated_at: new Date().toISOString() }).eq("id", context.cycle.id);
  if (cycleUpdate.error) return { ok: false, message: cycleUpdate.error.message };

  if (paymentAmount > 0) await admin.from("payments").insert({ cycle_id: context.cycle.id, amount: paymentAmount, notes: "Admin-applied payment" });
  if (applicableCredit > 0) await admin.from("credits").insert({ customer_id: context.cycle.customer_id, amount: -applicableCredit, reason: "Applied to active balance cycle" });

  const nextCreditBalance = Math.max(customer.creditBalance - applicableCredit, 0) + preview.overpayment;
  await admin.from("customer_profiles").update({ credit_balance: nextCreditBalance }).eq("user_id", context.cycle.customer_id);
  if (preview.overpayment > 0) await admin.from("credits").insert({ customer_id: context.cycle.customer_id, amount: preview.overpayment, reason: "Overpayment credit" });

  if (shouldArchiveBalance(preview.remaining)) {
    const total = context.summary.subtotal + context.summary.shipping + context.summary.adjustments;
    await admin.from("archived_invoices").insert({ cycle_id: context.cycle.id, customer_id: context.cycle.customer_id, cycle_label: formatCycleLabel(new Date()), paid_at: siteToday(), total, payment_total: Number(context.cycle.payments_applied ?? 0) + paymentAmount, credit_applied: Number(context.cycle.credits_applied ?? 0) + applicableCredit, status: "archived" });
    await admin.from("balance_line_items").update({ status: "archived", updated_at: new Date().toISOString() }).eq("cycle_id", context.cycle.id);
    await admin.from("balance_cycles").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", context.cycle.id);
    await admin.from("balance_cycles").insert({ customer_id: context.cycle.customer_id, status: "active", due_date: nextDueDateFromToday(), shipping_total: 0, adjustments_total: 0, payments_applied: 0, credits_applied: 0 });
  }

  return {
    ok: true,
    message: shouldArchiveBalance(preview.remaining) ? "Payment applied and the balance cycle was archived." : "Payment applied to the active balance cycle.",
    remainingBalance: Math.max(preview.remaining, 0),
    overpayment: preview.overpayment,
  };
}

export async function updateCurrentCustomerProfileSupabase(input: { address: string; timezone: string }) {
  const actor = await getCurrentActor();
  const address = input.address.trim();
  const timezone = input.timezone.trim();
  if (!address) return { ok: false, message: "Address is required." };
  if (!timezone) return { ok: false, message: "Timezone is required." };

  const admin = await getAdminClient();
  const [line1, city = "Pending", regionPostal = "Pending"] = address.split(",").map((part) => part.trim());
  const regionPostalParts = regionPostal.split(/\s+/);
  const postalCode = regionPostalParts.pop() ?? "Pending";
  const region = regionPostalParts.join(" ") || "Pending";

  await admin.from("customer_profiles").update({ timezone }).eq("user_id", actor.id);
  await admin.from("addresses").delete().eq("user_id", actor.id).eq("is_default", true);
  const { data: addressRow, error } = await admin.from("addresses").insert({ user_id: actor.id, line1: line1 || address, city, region, postal_code: postalCode, country: "US", is_default: true }).select("id").single();
  if (error) return { ok: false, message: error.message };

  await admin.from("customer_profiles").update({ default_address_id: addressRow.id }).eq("user_id", actor.id);
  return { ok: true, message: "Profile details updated." };
}
