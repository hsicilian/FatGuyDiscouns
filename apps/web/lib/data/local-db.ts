import "server-only";

import { assertProductionSupabaseReady, hasSupabaseEnv } from "../supabase";
import { recordAdminAuditEntry as recordAdminAuditEntrySupabase } from "../audit";
import { platformSummary } from "@fatguydiscounts/db";
import {
  listCrossListedInventorySupabase,
  listAdminAuditEntriesSupabase,
  getBalanceCycleSupabase,
  getCurrentCustomerSupabase,
  listCategoriesSupabase,
  listClaimHistoryForCustomerSupabase,
  getFinancialSummarySupabase,
  getOpenBalanceSummarySupabase,
  listCustomerItemRequestsSupabase,
  listCustomerMessagesForCustomerSupabase,
  getEventByIdSupabase,
  getProductByIdSupabase,
  getPaymentDefaultsSupabase,
  getCurrentInvoiceSnapshotForCustomerSupabase,
  getOutstandingBalanceForCustomerSupabase,
  getPlatformSummarySupabase,
  listArchivedInvoicesSupabase,
  listArchivedInvoicesForCustomerSupabase,
  listClaimedItemsSupabase,
  listClaimedItemsForCustomerSupabase,
  listCustomerNotesSupabase,
  listCustomersSupabase,
  listCreditHistorySupabase,
  listEventsSupabase,
  listNotificationsSupabase,
  listPaymentHistoryForCustomerSupabase,
  listPaymentHistorySupabase,
  listProductsSupabase,
  listRestockRequestsSupabase,
  listShipmentRecordsSupabase,
  listShipmentRecordsForCustomerSupabase,
} from "./supabase-reads";
import {
  addCustomerToShipmentQueueSupabase,
  addCustomerNoteToDatabaseSupabase,
  addManualBalanceItemToDatabaseSupabase,
  adjustInventoryInDatabaseSupabase,
  archiveProductInDatabaseSupabase,
  applyBalanceAdjustmentsToDatabaseSupabase,
  applyPaymentToDatabaseSupabase,
  cancelShipmentRequestInDatabaseSupabase,
  clearProductSaleInDatabaseSupabase,
  createCategoryInDatabaseSupabase,
  createManualCustomerInDatabaseSupabase,
  createInventoryItemInDatabaseSupabase,
  createInventoryItemsBulkInDatabaseSupabase,
  createEventInDatabaseSupabase,
  deleteArchivedProductInDatabaseSupabase,
  deleteCrossListedInventoryFromDatabaseSupabase,
  deleteCategoryInDatabaseSupabase,
  deleteEventInDatabaseSupabase,
  markNotificationReadInDatabaseSupabase,
  replyToCustomerMessageSupabase,
  removeClaimedItemFromDatabaseSupabase,
  restoreArchivedProductInDatabaseSupabase,
  saveCrossListedInventoryToDatabaseSupabase,
  submitClaimToDatabaseSupabase,
  submitCustomerItemRequestToDatabaseSupabase,
  submitCustomerMessageToDatabaseSupabase,
  submitRestockRequestToDatabaseSupabase,
  submitShipmentRequestToDatabaseSupabase,
  updateCreditInDatabaseSupabase,
  updatePaymentInDatabaseSupabase,
  updateCustomerProfileByAdminSupabase,
  updateHomepageFeaturedInDatabaseSupabase,
  updateInventoryItemInDatabaseSupabase,
  updateProductSaleInDatabaseSupabase,
  updateProductSaleByTargetPriceInDatabaseSupabase,
  updateProductSalesBulkInDatabaseSupabase,
  updateProductSalesBulkByTargetPriceInDatabaseSupabase,
  updateClaimedItemInDatabaseSupabase,
  updateCurrentCustomerProfileSupabase,
  updateCustomerAccountStateSupabase,
  updateCustomerRoleInDatabaseSupabase,
  updateEventInDatabaseSupabase,
  updateShipmentInDatabaseSupabase,
} from "./supabase-writes";

function requireSupabase() {
  assertProductionSupabaseReady();
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase configuration is required for this app.");
  }
}

export async function getPlatformSummary() {
  requireSupabase();
  return getPlatformSummarySupabase();
}

export async function listProducts(options?: { includeArchived?: boolean }) {
  requireSupabase();
  return listProductsSupabase(options);
}

export async function listCategories() {
  requireSupabase();
  return listCategoriesSupabase();
}

export async function getProductById(productId: string) {
  requireSupabase();
  return getProductByIdSupabase(productId);
}

export async function getCurrentCustomer() {
  requireSupabase();
  return getCurrentCustomerSupabase();
}

export async function listCustomers() {
  requireSupabase();
  return listCustomersSupabase();
}

export async function createManualCustomerInDatabase(input: {
  displayName: string;
  email: string;
  password: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  phone: string;
  timezone: string;
}) {
  requireSupabase();
  return createManualCustomerInDatabaseSupabase(input);
}

export async function updateCurrentCustomerProfile(input: { street: string; city: string; region: string; postalCode: string; phone: string; timezone: string }) {
  requireSupabase();
  return updateCurrentCustomerProfileSupabase(input);
}

export async function updateCustomerProfileByAdmin(
  customerId: string,
  input: { street: string; city: string; region: string; postalCode: string; phone: string; timezone: string },
) {
  requireSupabase();
  return updateCustomerProfileByAdminSupabase(customerId, input);
}

export async function getBalanceCycle(customerId?: string) {
  requireSupabase();
  return getBalanceCycleSupabase(customerId);
}

export async function getOpenBalanceSummary(customerId?: string) {
  requireSupabase();
  return getOpenBalanceSummarySupabase(customerId);
}

export async function getCurrentInvoiceSnapshotForCustomer(customerId: string) {
  requireSupabase();
  return getCurrentInvoiceSnapshotForCustomerSupabase(customerId);
}

export async function listClaimedItems() {
  requireSupabase();
  return listClaimedItemsSupabase();
}

export async function listClaimedItemsForCustomer(customerId: string) {
  requireSupabase();
  return listClaimedItemsForCustomerSupabase(customerId);
}

export async function listArchivedInvoices() {
  requireSupabase();
  return listArchivedInvoicesSupabase();
}

export async function listArchivedInvoicesForCustomer(customerId: string) {
  requireSupabase();
  return listArchivedInvoicesForCustomerSupabase(customerId);
}

export async function listShipmentRecords() {
  requireSupabase();
  return listShipmentRecordsSupabase();
}

export async function listShipmentRecordsForCustomer(customerId: string) {
  requireSupabase();
  return listShipmentRecordsForCustomerSupabase(customerId);
}

export async function listPaymentHistoryForCustomer(customerId: string) {
  requireSupabase();
  return listPaymentHistoryForCustomerSupabase(customerId);
}

export async function listPaymentHistory() {
  requireSupabase();
  return listPaymentHistorySupabase();
}

export async function listCreditHistory() {
  requireSupabase();
  return listCreditHistorySupabase();
}

export async function listClaimHistoryForCustomer(customerId: string) {
  requireSupabase();
  return listClaimHistoryForCustomerSupabase(customerId);
}

export async function listCustomerNotes(customerId?: string) {
  requireSupabase();
  return listCustomerNotesSupabase(customerId);
}

export async function listCustomerMessagesForCustomer(customerId: string, options?: { limit?: number }) {
  requireSupabase();
  return listCustomerMessagesForCustomerSupabase(customerId, options);
}

export async function listCustomerItemRequests(customerId?: string, options?: { limit?: number }) {
  requireSupabase();
  return listCustomerItemRequestsSupabase(customerId, options);
}

export async function listRestockRequests(customerId?: string) {
  requireSupabase();
  return listRestockRequestsSupabase(customerId);
}

export async function listNotifications(options?: { includeRead?: boolean }) {
  requireSupabase();
  return listNotificationsSupabase(options);
}

export async function listAdminAuditEntries(limit?: number) {
  requireSupabase();
  return listAdminAuditEntriesSupabase(limit);
}

export async function listCrossListedInventory(search?: string) {
  requireSupabase();
  return listCrossListedInventorySupabase(search);
}

export async function listEvents() {
  requireSupabase();
  return listEventsSupabase();
}

export async function getEventById(eventId: string) {
  requireSupabase();
  return getEventByIdSupabase(eventId);
}

export async function getPaymentDefaults(customerId?: string) {
  requireSupabase();
  return getPaymentDefaultsSupabase(customerId);
}

export async function getOutstandingBalanceForCustomer(customerId?: string) {
  requireSupabase();
  return customerId
    ? getOutstandingBalanceForCustomerSupabase(customerId)
    : { totalAmount: 0, invoiceAmount: 0, shippingAmount: 0 };
}

export async function getFinancialSummary() {
  requireSupabase();
  return getFinancialSummarySupabase();
}

export async function submitClaimToDatabase(productId: string, requestedQuantity: number) {
  requireSupabase();
  return submitClaimToDatabaseSupabase(productId, requestedQuantity);
}

export async function adjustInventoryInDatabase(productId: string, quantityChange: number) {
  requireSupabase();
  return adjustInventoryInDatabaseSupabase(productId, quantityChange);
}

export async function archiveProductInDatabase(productId: string) {
  requireSupabase();
  return archiveProductInDatabaseSupabase(productId);
}

export async function restoreArchivedProductInDatabase(productId: string) {
  requireSupabase();
  return restoreArchivedProductInDatabaseSupabase(productId);
}

export async function deleteArchivedProductInDatabase(productId: string) {
  requireSupabase();
  return deleteArchivedProductInDatabaseSupabase(productId);
}

export async function createInventoryItemInDatabase(input: {
  title: string;
  description: string;
  price: number;
  cost: number;
  quantity: number;
  category: string;
  sku: string;
  location: string;
  images: File[];
}) {
  requireSupabase();
  return createInventoryItemInDatabaseSupabase(input);
}

export async function createInventoryItemsBulkInDatabase(input: Array<{
  title: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  sku: string;
  location: string;
}>) {
  requireSupabase();
  return createInventoryItemsBulkInDatabaseSupabase(input);
}

export async function updateInventoryItemInDatabase(input: {
  productId: string;
  title: string;
  description: string;
  price: number;
  cost: number;
  category: string;
  sku: string;
  location: string;
}) {
  requireSupabase();
  return updateInventoryItemInDatabaseSupabase(input);
}

export async function createCategoryInDatabase(name: string) {
  requireSupabase();
  return createCategoryInDatabaseSupabase(name);
}

export async function deleteCategoryInDatabase(categoryId: string) {
  requireSupabase();
  return deleteCategoryInDatabaseSupabase(categoryId);
}

export async function updateProductSaleInDatabase(productId: string, salePercentage: number, saleEndsAt: string) {
  requireSupabase();
  return updateProductSaleInDatabaseSupabase(productId, salePercentage, saleEndsAt);
}

export async function updateProductSaleByTargetPriceInDatabase(productId: string, salePrice: number, saleEndsAt: string) {
  requireSupabase();
  return updateProductSaleByTargetPriceInDatabaseSupabase(productId, salePrice, saleEndsAt);
}

export async function updateProductSalesBulkInDatabase(productIds: string[], salePercentage: number, saleEndsAt: string) {
  requireSupabase();
  return updateProductSalesBulkInDatabaseSupabase(productIds, salePercentage, saleEndsAt);
}

export async function updateProductSalesBulkByTargetPriceInDatabase(productIds: string[], salePrice: number, saleEndsAt: string) {
  requireSupabase();
  return updateProductSalesBulkByTargetPriceInDatabaseSupabase(productIds, salePrice, saleEndsAt);
}

export async function clearProductSaleInDatabase(productId: string) {
  requireSupabase();
  return clearProductSaleInDatabaseSupabase(productId);
}

export async function updateHomepageFeaturedInDatabase(productId: string, featured: boolean) {
  requireSupabase();
  return updateHomepageFeaturedInDatabaseSupabase(productId, featured);
}

export async function submitRestockRequestToDatabase(productId: string) {
  requireSupabase();
  return submitRestockRequestToDatabaseSupabase(productId);
}

export async function submitCustomerMessageToDatabase(message: string) {
  requireSupabase();
  return submitCustomerMessageToDatabaseSupabase(message);
}

export async function submitCustomerItemRequestToDatabase(request: string) {
  requireSupabase();
  return submitCustomerItemRequestToDatabaseSupabase(request);
}

export async function replyToCustomerMessage(customerId: string, message: string) {
  requireSupabase();
  return replyToCustomerMessageSupabase(customerId, message);
}

export async function submitShipmentRequestToDatabase() {
  requireSupabase();
  return submitShipmentRequestToDatabaseSupabase();
}

export async function addCustomerToShipmentQueueInDatabase(customerId: string) {
  requireSupabase();
  return addCustomerToShipmentQueueSupabase(customerId);
}

export async function cancelShipmentRequestInDatabase(shipmentId?: string) {
  requireSupabase();
  return cancelShipmentRequestInDatabaseSupabase(shipmentId);
}

export async function updateShipmentInDatabase(
  shipmentId: string,
  nextStatus: "none" | "requested" | "in_progress" | "completed",
  trackingNumber: string,
  shippingInvoice: string,
  customerId?: string,
  requestedAt?: string,
) {
  requireSupabase();
  return updateShipmentInDatabaseSupabase(shipmentId, nextStatus, trackingNumber, shippingInvoice, customerId, requestedAt);
}

export async function updateCustomerAccountState(
  customerId: string,
  nextState: "pending_approval" | "approved" | "claiming_disabled" | "banned",
) {
  requireSupabase();
  return updateCustomerAccountStateSupabase(customerId, nextState);
}

export async function updateCustomerRoleInDatabase(customerId: string, nextRole: "admin") {
  requireSupabase();
  return updateCustomerRoleInDatabaseSupabase(customerId, nextRole);
}

export async function addCustomerNoteToDatabase(customerId: string, note: string) {
  requireSupabase();
  return addCustomerNoteToDatabaseSupabase(customerId, note);
}

export async function addManualBalanceItemToDatabase(title: string, quantity: number, unitPrice: number, recordedAt?: string, customerId?: string) {
  requireSupabase();
  return addManualBalanceItemToDatabaseSupabase(title, quantity, unitPrice, recordedAt, customerId);
}

export async function updateClaimedItemInDatabase(claimId: string, quantity: number, unitPrice: number) {
  requireSupabase();
  return updateClaimedItemInDatabaseSupabase(claimId, quantity, unitPrice);
}

export async function removeClaimedItemFromDatabase(claimId: string) {
  requireSupabase();
  return removeClaimedItemFromDatabaseSupabase(claimId);
}

export async function applyBalanceAdjustmentsToDatabase(shippingChange: number, adjustmentChange: number, customerId?: string) {
  requireSupabase();
  return applyBalanceAdjustmentsToDatabaseSupabase(shippingChange, adjustmentChange, customerId);
}

export async function applyPaymentToDatabase(paymentAmount: number, creditAmount: number, recordedAt?: string, customerId?: string) {
  requireSupabase();
  return applyPaymentToDatabaseSupabase(paymentAmount, creditAmount, recordedAt, customerId);
}

export async function updatePaymentInDatabase(paymentId: string, paymentAmount: number, recordedAt?: string) {
  requireSupabase();
  return updatePaymentInDatabaseSupabase(paymentId, paymentAmount, recordedAt);
}

export async function updateCreditInDatabase(creditId: string, creditAmount: number, recordedAt?: string, reason?: string) {
  requireSupabase();
  return updateCreditInDatabaseSupabase(creditId, creditAmount, recordedAt, reason);
}

export async function createEventInDatabase(input: {
  title: string;
  startsAtLocal: string;
  description: string;
  externalLink: string;
  platform: string;
  timeZone: string;
  repeatWeekly?: boolean;
  repeatUntilLocal?: string;
}) {
  requireSupabase();
  return createEventInDatabaseSupabase(input);
}

export async function updateEventInDatabase(input: {
  eventId: string;
  title: string;
  startsAtLocal: string;
  description: string;
  externalLink: string;
  platform: string;
  timeZone: string;
}) {
  requireSupabase();
  return updateEventInDatabaseSupabase(input);
}

export async function deleteEventInDatabase(eventId: string) {
  requireSupabase();
  return deleteEventInDatabaseSupabase(eventId);
}

export async function markNotificationReadInDatabase(notificationId: string) {
  requireSupabase();
  return markNotificationReadInDatabaseSupabase(notificationId);
}

export async function saveCrossListedInventoryToDatabase(input: {
  sku: string;
  itemName: string;
  cost?: number | null;
  platforms: string[];
}) {
  requireSupabase();
  return saveCrossListedInventoryToDatabaseSupabase(input);
}

export async function deleteCrossListedInventoryFromDatabase(recordId: string) {
  requireSupabase();
  return deleteCrossListedInventoryFromDatabaseSupabase(recordId);
}

export async function recordAdminAuditEntryInDatabase(input: {
  actionType: string;
  entityType: string;
  entityId?: string | null;
  targetCustomerId?: string | null;
  summary: string;
  actorId?: string;
  actorName?: string;
  actorRole?: "customer" | "admin" | "master_admin";
}) {
  requireSupabase();
  return recordAdminAuditEntrySupabase(input);
}

export { platformSummary };
