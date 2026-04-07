import { revalidatePath } from "next/cache";
import type { FormActionState, ShipmentStatus, UserRole } from "@fatguydiscounts/types";
import { previewApprovalAction } from "./approvals";
import { previewClaimAction } from "./claims";
import { previewPaymentAction } from "./payments";
import { previewShipmentRequest } from "./shipments";
import { getCurrentSessionUser } from "../auth/session";
import { updateStoredAccountRole, updateStoredAccountState } from "../auth/local-auth-store";
import {
  addCustomerToShipmentQueueInDatabase,
  addCustomerNoteToDatabase,
  addManualBalanceItemToDatabase,
  adjustInventoryInDatabase,
  archiveProductInDatabase,
  applyBalanceAdjustmentsToDatabase,
  applyPaymentToDatabase,
  cancelShipmentRequestInDatabase,
  clearProductSaleInDatabase,
  createCategoryInDatabase,
  createInventoryItemInDatabase,
  createInventoryItemsBulkInDatabase,
  createEventInDatabase,
  deleteArchivedProductInDatabase,
  deleteCategoryInDatabase,
  deleteCrossListedInventoryFromDatabase,
  deleteEventInDatabase,
  markNotificationReadInDatabase,
  replyToCustomerMessage,
  removeClaimedItemFromDatabase,
  saveCrossListedInventoryToDatabase,
  submitClaimToDatabase,
  submitCustomerItemRequestToDatabase,
  submitCustomerMessageToDatabase,
  submitRestockRequestToDatabase,
  submitShipmentRequestToDatabase,
  updateClaimedItemInDatabase,
  updateCustomerAccountState,
  updateCustomerRoleInDatabase,
  updateCurrentCustomerProfile,
  updateCustomerProfileByAdmin,
  updateEventInDatabase,
  updateHomepageFeaturedInDatabase,
  updateProductSaleInDatabase,
  updateShipmentInDatabase,
  recordAdminAuditEntryInDatabase,
} from "../data/local-db";
import { hasSupabaseEnv } from "../supabase";

async function requireCustomerMutationAccess() {
  const currentUser = await getCurrentSessionUser();

  if (!currentUser || currentUser.role !== "customer" || currentUser.accountState === "banned") {
    return {
      ok: false as const,
      message: "Customer access is required for this action.",
    };
  }

  return { ok: true as const, currentUser };
}

async function requireAdminMutationAccess() {
  const currentUser = await getCurrentSessionUser();

  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "master_admin") || currentUser.accountState === "banned") {
    return {
      ok: false as const,
      message: "Admin access is required for this action.",
    };
  }

  return { ok: true as const, currentUser };
}

async function requireMasterAdminMutationAccess() {
  const currentUser = await getCurrentSessionUser();

  if (!currentUser || currentUser.role !== "master_admin" || currentUser.accountState === "banned") {
    return {
      ok: false as const,
      message: "Master admin access is required for this action.",
    };
  }

  return { ok: true as const, currentUser };
}

async function recordAuditIfSuccessful(
  result: FormActionState,
  input: {
    actorId: string;
    actorName: string;
    actorRole: UserRole;
    actionType: string;
    entityType: string;
    entityId?: string | null;
    targetCustomerId?: string | null;
    summary: string;
  },
) {
  if (!result.ok || input.actorRole === "master_admin") {
    return;
  }

  await recordAdminAuditEntryInDatabase(input);
}

export async function submitClaim(productId: string, requestedQuantity: number): Promise<FormActionState> {
  const access = await requireCustomerMutationAccess();
  if (!access.ok) {
    return access;
  }

  const preview = await previewClaimAction(productId, requestedQuantity);

  if (!preview.ok) {
    return preview;
  }

  const result = await submitClaimToDatabase(productId, requestedQuantity);
  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/claims");
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/claims");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function addManualBalanceItem(title: string, quantity: number, unitPrice: number, recordedAt?: string, customerId?: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await addManualBalanceItemToDatabase(title, quantity, unitPrice, recordedAt, customerId);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "balance.manual_item",
    entityType: "balance_line_item",
    targetCustomerId: customerId ?? null,
    summary: `Added manual item "${title}" (${quantity} x ${unitPrice.toFixed(2)})${recordedAt ? ` dated ${recordedAt}` : ""}.`,
  });
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/claims");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/customers");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function updateBalanceLineItem(claimId: string, quantity: number, unitPrice: number): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await updateClaimedItemInDatabase(claimId, quantity, unitPrice);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "balance.line_item_update",
    entityType: "balance_line_item",
    entityId: claimId,
    summary: `Updated balance line item ${claimId} to quantity ${quantity} at ${unitPrice.toFixed(2)}.`,
  });
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/claims");
  revalidatePath("/admin/payments");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function removeBalanceLineItem(claimId: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await removeClaimedItemFromDatabase(claimId);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "balance.line_item_remove",
    entityType: "balance_line_item",
    entityId: claimId,
    summary: `Removed balance line item ${claimId}.`,
  });
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/claims");
  revalidatePath("/admin/payments");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function applyBalanceAdjustments(shippingChange: number, adjustmentChange: number, customerId?: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await applyBalanceAdjustmentsToDatabase(shippingChange, adjustmentChange, customerId);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "balance.adjustments",
    entityType: "balance_cycle",
    targetCustomerId: customerId ?? null,
    summary: `Adjusted shipping by ${shippingChange.toFixed(2)} and balance modifiers by ${adjustmentChange.toFixed(2)}.`,
  });
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/claims");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/customers");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function adjustInventory(productId: string, quantityChange: number): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await adjustInventoryInDatabase(productId, quantityChange);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "inventory.adjust",
    entityType: "product",
    entityId: productId,
    summary: `Adjusted product inventory by ${quantityChange}.`,
  });
  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/claims");
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/account");
  revalidatePath("/account/messages");
  revalidatePath("/admin/customers");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function createInventoryItem(
  title: string,
  description: string,
  price: number,
  cost: number,
  quantity: number,
  category: string,
  sku: string,
  location: string,
  images: File[],
): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await createInventoryItemInDatabase({
    title,
    description,
    price,
    cost,
    quantity,
    category,
    sku,
    location,
    images,
  });
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "inventory.create",
    entityType: "product",
    summary: `Created inventory item "${title}" in ${category} with SKU ${sku}.`,
  });
  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/claims");
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function createInventoryItemsBulk(
  items: Array<{
    title: string;
    description: string;
    price: number;
    quantity: number;
    category: string;
    sku: string;
    location: string;
  }>,
): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await createInventoryItemsBulkInDatabase(items);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "inventory.bulk_import",
    entityType: "product",
    summary: `Imported ${items.length} inventory items in bulk.`,
  });
  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/claims");
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function createCategory(name: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await createCategoryInDatabase(name);
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function deleteCategory(categoryId: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await deleteCategoryInDatabase(categoryId);
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function updateProductSale(
  productId: string,
  salePercentage: number,
  saleEndsAt: string,
): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await updateProductSaleInDatabase(productId, salePercentage, saleEndsAt);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "inventory.sale_set",
    entityType: "product",
    entityId: productId,
    summary: `Set product sale to ${salePercentage}% off through ${saleEndsAt}.`,
  });
  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/claims");
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function clearProductSale(productId: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await clearProductSaleInDatabase(productId);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "inventory.sale_clear",
    entityType: "product",
    entityId: productId,
    summary: `Cleared product sale pricing.`,
  });
  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/claims");
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function updateHomepageFeatured(productId: string, featured: boolean): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await updateHomepageFeaturedInDatabase(productId, featured);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: featured ? "inventory.homepage_feature_on" : "inventory.homepage_feature_off",
    entityType: "product",
    entityId: productId,
    summary: `${featured ? "Featured" : "Removed"} product ${productId} on homepage.`,
  });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function archiveProduct(productId: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await archiveProductInDatabase(productId);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "inventory.archive",
    entityType: "product",
    entityId: productId,
    summary: `Archived product ${productId}.`,
  });
  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/claims");
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/archived");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function deleteArchivedProduct(productId: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await deleteArchivedProductInDatabase(productId);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "inventory.delete",
    entityType: "product",
    entityId: productId,
    summary: `Deleted archived product ${productId}.`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/archived");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function submitRestockRequest(productId: string): Promise<FormActionState> {
  const result = await submitRestockRequestToDatabase(productId);
  revalidatePath("/store");
  revalidatePath("/admin");
  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function updateApprovalState(
  customerId: string,
  nextState: "approved" | "claiming_disabled" | "banned",
): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const preview = previewApprovalAction(nextState);

  if (!preview.allowed) {
    return {
      ok: false,
      message: "Approval action is not permitted.",
    };
  }

  const result = await updateCustomerAccountState(customerId, nextState);
  if (result.ok && !hasSupabaseEnv()) {
    await updateStoredAccountState(customerId, nextState);
  }
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "customer.account_state",
    entityType: "customer",
    entityId: customerId,
    targetCustomerId: customerId,
    summary: `Changed customer ${customerId} state to ${nextState.replaceAll("_", " ")}.`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/customers");
  revalidatePath("/account");
  revalidatePath("/login");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function addCustomerNote(customerId: string, note: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await addCustomerNoteToDatabase(customerId, note);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "customer.note",
    entityType: "customer_note",
    targetCustomerId: customerId,
    summary: `Added internal note for customer ${customerId}.`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/customers");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function promoteCustomerToAdmin(customerId: string): Promise<FormActionState> {
  const access = await requireMasterAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await updateCustomerRoleInDatabase(customerId, "admin");
  if (result.ok && !hasSupabaseEnv()) {
    await updateStoredAccountRole(customerId, "admin");
  }
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "customer.role",
    entityType: "customer",
    entityId: customerId,
    targetCustomerId: customerId,
    summary: `Promoted customer ${customerId} to admin.`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath("/login");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function updateCurrentCustomerProfileDetails(
  street: string,
  city: string,
  region: string,
  postalCode: string,
  timezone: string,
): Promise<FormActionState> {
  const access = await requireCustomerMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await updateCurrentCustomerProfile({ street, city, region, postalCode, timezone });
  revalidatePath("/account");
  revalidatePath("/claims");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function updateCustomerProfileDetailsByAdmin(
  customerId: string,
  street: string,
  city: string,
  region: string,
  postalCode: string,
  timezone: string,
): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await updateCustomerProfileByAdmin(customerId, { street, city, region, postalCode, timezone });
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "customer.profile_update",
    entityType: "customer",
    entityId: customerId,
    targetCustomerId: customerId,
    summary: `Updated customer profile address/timezone for ${customerId}.`,
  });
  revalidatePath("/account");
  revalidatePath("/claims");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/customers/[customerId]", "page");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function sendCustomerMessage(message: string): Promise<FormActionState> {
  const access = await requireCustomerMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await submitCustomerMessageToDatabase(message);
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/customers/[customerId]", "page");
  revalidatePath("/admin/customers/[customerId]/messages", "page");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function submitCustomerItemRequest(request: string): Promise<FormActionState> {
  const access = await requireCustomerMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await submitCustomerItemRequestToDatabase(request);
  revalidatePath("/account");
  revalidatePath("/store");
  revalidatePath("/admin");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/customers/[customerId]", "page");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function sendAdminCustomerReply(customerId: string, message: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await replyToCustomerMessage(customerId, message);
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/customers/[customerId]", "page");
  revalidatePath("/admin/customers/[customerId]/messages", "page");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function submitShipmentRequest(addressConfirmed = false): Promise<FormActionState> {
  const access = await requireCustomerMutationAccess();
  if (!access.ok) {
    return access;
  }

  const preview = await previewShipmentRequest();

  if (!preview.allowed) {
    return {
      ok: false,
      message: "Shipment request is blocked.",
    };
  }

  if (!addressConfirmed) {
    return {
      ok: false,
      message: "Confirm the address on file before requesting shipment.",
    };
  }

  const result = await submitShipmentRequestToDatabase();
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/shipments");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function addCustomerToShipmentQueue(customerId: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await addCustomerToShipmentQueueInDatabase(customerId);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "shipment.queue_add",
    entityType: "shipment",
    targetCustomerId: customerId,
    summary: `Added customer ${customerId} to the shipment queue.`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/shipments");
  revalidatePath("/admin/customers");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function cancelShipmentRequest(shipmentId?: string): Promise<FormActionState> {
  const currentUser = await getCurrentSessionUser();

  if (!currentUser || (currentUser.role !== "customer" && currentUser.role !== "admin" && currentUser.role !== "master_admin") || currentUser.accountState === "banned") {
    return {
      ok: false,
      message: "Customer or admin access is required for this action.",
    };
  }

  const result = await cancelShipmentRequestInDatabase(shipmentId);
  if (currentUser.role !== "customer") {
    await recordAuditIfSuccessful(result, {
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      actorRole: currentUser.role,
      actionType: "shipment.cancel",
      entityType: "shipment",
      entityId: shipmentId ?? null,
      summary: `Canceled shipment request${shipmentId ? ` ${shipmentId}` : ""}.`,
    });
  }
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/shipments");
  revalidatePath("/admin/customers");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function updateShipment(
  shipmentId: string,
  nextStatus: ShipmentStatus,
  trackingNumber: string,
  shippingInvoice: string,
): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await updateShipmentInDatabase(shipmentId, nextStatus, trackingNumber, shippingInvoice);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "shipment.update",
    entityType: "shipment",
    entityId: shipmentId,
    summary: `Updated shipment ${shipmentId} to ${nextStatus.replaceAll("_", " ")}.`,
  });
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/shipments");
  revalidatePath("/admin/customers");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function previewPaymentSubmission(paymentAmount: number, creditAmount: number, recordedAt?: string, customerId?: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await applyPaymentToDatabase(paymentAmount, creditAmount, recordedAt, customerId);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "payment.apply",
    entityType: "balance_cycle",
    targetCustomerId: customerId ?? null,
    summary: `Applied payment ${paymentAmount.toFixed(2)} and credit ${creditAmount.toFixed(2)}${recordedAt ? ` dated ${recordedAt}` : ""}.`,
  });
  revalidatePath("/account");
  revalidatePath("/account/history");
  revalidatePath("/admin");
  revalidatePath("/admin/claims");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/customers");

  return {
    ...(result.ok ? result : await previewPaymentAction(paymentAmount, creditAmount)),
    submittedAt: new Date().toISOString(),
  };
}

export async function createEvent(
  title: string,
  startsAtLocal: string,
  description: string,
  externalLink: string,
  platform: string,
  timeZone: string,
  repeatWeekly = false,
  repeatUntilLocal = "",
): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await createEventInDatabase({
    title,
    startsAtLocal,
    description,
    externalLink,
    platform,
    timeZone,
    repeatWeekly,
    repeatUntilLocal,
  });
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "event.create",
    entityType: "event",
    summary: `Created event "${title}".`,
  });
  revalidatePath("/events");
  revalidatePath("/admin");
  revalidatePath("/admin/events");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function updateEvent(
  eventId: string,
  title: string,
  startsAtLocal: string,
  description: string,
  externalLink: string,
  platform: string,
  timeZone: string,
): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await updateEventInDatabase({
    eventId,
    title,
    startsAtLocal,
    description,
    externalLink,
    platform,
    timeZone,
  });
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "event.update",
    entityType: "event",
    entityId: eventId,
    summary: `Updated event "${title}".`,
  });
  revalidatePath("/events");
  revalidatePath("/admin");
  revalidatePath("/admin/events");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function deleteEvent(eventId: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await deleteEventInDatabase(eventId);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "event.delete",
    entityType: "event",
    entityId: eventId,
    summary: `Deleted event ${eventId}.`,
  });
  revalidatePath("/events");
  revalidatePath("/admin");
  revalidatePath("/admin/events");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function dismissNotification(notificationId: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await markNotificationReadInDatabase(notificationId);
  revalidatePath("/admin");
  revalidatePath("/admin/notifications");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function saveCrossListedInventory(
  sku: string,
  itemName: string,
  cost: number | null | undefined,
  platforms: string[],
): Promise<FormActionState> {
  const access = await requireMasterAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await saveCrossListedInventoryToDatabase({ sku, itemName, cost, platforms });
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "cross_listed.save",
    entityType: "cross_listed_inventory",
    entityId: sku,
    summary: `Saved cross-listed record for SKU ${sku}.`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/cross-listed");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function bulkImportCrossListedInventory(
  items: Array<{
    sku: string;
    itemName: string;
    platforms: string[];
  }>,
): Promise<FormActionState> {
  const access = await requireMasterAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  let importedCount = 0;
  for (const item of items) {
    const result = await saveCrossListedInventoryToDatabase(item);
    if (!result.ok) {
      return {
        ...result,
        message: `${result.message} Import stopped on SKU ${item.sku}.`,
      };
    }
    importedCount += 1;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/cross-listed");

  return {
    ok: true,
    message: `Imported ${importedCount} cross-listed ${importedCount === 1 ? "item" : "items"}.`,
    submittedAt: new Date().toISOString(),
  };
}

export async function deleteCrossListedInventory(recordId: string): Promise<FormActionState> {
  const access = await requireMasterAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await deleteCrossListedInventoryFromDatabase(recordId);
  await recordAuditIfSuccessful(result, {
    actorId: access.currentUser.id,
    actorName: access.currentUser.displayName,
    actorRole: access.currentUser.role,
    actionType: "cross_listed.delete",
    entityType: "cross_listed_inventory",
    entityId: recordId,
    summary: `Deleted cross-listed record ${recordId}.`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/cross-listed");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}
