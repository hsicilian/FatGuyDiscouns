import { revalidatePath } from "next/cache";
import type { FormActionState, ShipmentStatus } from "@fatguydiscounts/types";
import { previewApprovalAction } from "./approvals";
import { previewClaimAction } from "./claims";
import { previewPaymentAction } from "./payments";
import { previewShipmentRequest } from "./shipments";
import { getCurrentSessionUser } from "../auth/session";
import { updateStoredAccountRole, updateStoredAccountState } from "../auth/local-auth-store";
import {
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
  deleteArchivedProductInDatabase,
  deleteCategoryInDatabase,
  deleteCrossListedInventoryFromDatabase,
  markNotificationReadInDatabase,
  replyToCustomerMessage,
  removeClaimedItemFromDatabase,
  saveCrossListedInventoryToDatabase,
  submitClaimToDatabase,
  submitCustomerItemRequestToDatabase,
  submitCustomerMessageToDatabase,
  submitRestockRequestToDatabase,
  submitShipmentRequestToDatabase,
  updateProductSaleInDatabase,
  updateHomepageFeaturedInDatabase,
  updateClaimedItemInDatabase,
  updateCustomerAccountState,
  updateCustomerRoleInDatabase,
  updateCurrentCustomerProfile,
  updateCustomerProfileByAdmin,
  updateShipmentInDatabase,
  createEventInDatabase,
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

export async function addManualBalanceItem(title: string, quantity: number, unitPrice: number, customerId?: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await addManualBalanceItemToDatabase(title, quantity, unitPrice, customerId);
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
    quantity,
    category,
    sku,
    location,
    images,
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

export async function cancelShipmentRequest(shipmentId?: string): Promise<FormActionState> {
  const currentUser = await getCurrentSessionUser();

  if (!currentUser || (currentUser.role !== "customer" && currentUser.role !== "admin" && currentUser.role !== "master_admin") || currentUser.accountState === "banned") {
    return {
      ok: false,
      message: "Customer or admin access is required for this action.",
    };
  }

  const result = await cancelShipmentRequestInDatabase(shipmentId);
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
): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await updateShipmentInDatabase(shipmentId, nextStatus, trackingNumber);
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/shipments");
  revalidatePath("/admin/customers");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}

export async function previewPaymentSubmission(paymentAmount: number, creditAmount: number, customerId?: string): Promise<FormActionState> {
  const access = await requireAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await applyPaymentToDatabase(paymentAmount, creditAmount, customerId);
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
  platforms: string[],
): Promise<FormActionState> {
  const access = await requireMasterAdminMutationAccess();
  if (!access.ok) {
    return access;
  }

  const result = await saveCrossListedInventoryToDatabase({ sku, itemName, platforms });
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
  revalidatePath("/admin");
  revalidatePath("/admin/cross-listed");

  return {
    ...result,
    submittedAt: new Date().toISOString(),
  };
}
