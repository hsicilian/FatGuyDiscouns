import "server-only";

import { assertProductionSupabaseReady, hasSupabaseEnv } from "../supabase";
import { recordAdminAuditEntry as recordAdminAuditEntrySupabase } from "../audit";
import { platformSummary } from "@fatguydiscounts/db";
import * as fallback from "./local-db-fallback";
import {
  listCrossListedInventorySupabase,
  listAdminAuditEntriesSupabase,
  getBalanceCycleSupabase,
  getCurrentCustomerSupabase,
  listCategoriesSupabase,
  listClaimHistoryForCustomerSupabase,
  getFinancialSummarySupabase,
  listCustomerItemRequestsSupabase,
  listCustomerMessagesForCustomerSupabase,
  getEventByIdSupabase,
  getProductByIdSupabase,
  getPaymentDefaultsSupabase,
  getPlatformSummarySupabase,
  listArchivedInvoicesSupabase,
  listArchivedInvoicesForCustomerSupabase,
  listClaimedItemsSupabase,
  listClaimedItemsForCustomerSupabase,
  listCustomerNotesSupabase,
  listCustomersSupabase,
  listEventsSupabase,
  listNotificationsSupabase,
  listPaymentHistoryForCustomerSupabase,
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
  createInventoryItemInDatabaseSupabase,
  createInventoryItemsBulkInDatabaseSupabase,
  deleteArchivedProductInDatabaseSupabase,
  deleteCrossListedInventoryFromDatabaseSupabase,
  deleteCategoryInDatabaseSupabase,
  deleteEventInDatabaseSupabase,
  markNotificationReadInDatabaseSupabase,
  replyToCustomerMessageSupabase,
  removeClaimedItemFromDatabaseSupabase,
  saveCrossListedInventoryToDatabaseSupabase,
  submitClaimToDatabaseSupabase,
  submitCustomerItemRequestToDatabaseSupabase,
  submitCustomerMessageToDatabaseSupabase,
  submitRestockRequestToDatabaseSupabase,
  submitShipmentRequestToDatabaseSupabase,
  updatePaymentInDatabaseSupabase,
  updateCustomerProfileByAdminSupabase,
  updateHomepageFeaturedInDatabaseSupabase,
  updateProductSaleInDatabaseSupabase,
  updateClaimedItemInDatabaseSupabase,
  updateCurrentCustomerProfileSupabase,
  updateCustomerAccountStateSupabase,
  updateCustomerRoleInDatabaseSupabase,
  updateEventInDatabaseSupabase,
  updateShipmentInDatabaseSupabase,
  createEventInDatabaseSupabase,
} from "./supabase-writes";

export type LocalDatabase = fallback.LocalDatabase;
export const initialDatabase = fallback.initialDatabase;

function shouldUseSupabase() {
  assertProductionSupabaseReady();
  return hasSupabaseEnv();
}

export async function resetLocalDatabase() {
  return fallback.resetLocalDatabase();
}

export async function getPlatformSummary() {
  return shouldUseSupabase() ? getPlatformSummarySupabase() : fallback.getPlatformSummary();
}

export async function listProducts(options?: { includeArchived?: boolean }) {
  return shouldUseSupabase() ? listProductsSupabase(options) : fallback.listProducts(options);
}

export async function listCategories() {
  return shouldUseSupabase() ? listCategoriesSupabase() : fallback.listCategories();
}

export async function getProductById(productId: string) {
  return shouldUseSupabase() ? getProductByIdSupabase(productId) : fallback.getProductById(productId);
}

export async function getCurrentCustomer() {
  return shouldUseSupabase() ? getCurrentCustomerSupabase() : fallback.getCurrentCustomer();
}

export async function setActiveCustomer(customerId: string) {
  return fallback.setActiveCustomer(customerId);
}

export async function listCustomers() {
  return shouldUseSupabase() ? listCustomersSupabase() : fallback.listCustomers();
}

export async function createPendingCustomerProfile(input: {
  displayName: string;
  email: string;
}) {
  return fallback.createPendingCustomerProfile(input);
}

export async function removeCustomerProfileById(customerId: string) {
  return fallback.removeCustomerProfileById(customerId);
}

export async function updateCurrentCustomerProfile(input: { street: string; city: string; region: string; postalCode: string; timezone: string }) {
  return shouldUseSupabase()
    ? updateCurrentCustomerProfileSupabase(input)
    : fallback.updateCurrentCustomerProfile(input);
}

export async function updateCustomerProfileByAdmin(
  customerId: string,
  input: { street: string; city: string; region: string; postalCode: string; timezone: string },
) {
  return shouldUseSupabase()
    ? updateCustomerProfileByAdminSupabase(customerId, input)
    : fallback.updateCustomerProfileByAdmin(customerId, input);
}

export async function getBalanceCycle(customerId?: string) {
  return shouldUseSupabase() ? getBalanceCycleSupabase(customerId) : fallback.getBalanceCycle();
}

export async function listClaimedItems() {
  return shouldUseSupabase() ? listClaimedItemsSupabase() : fallback.listClaimedItems();
}

export async function listClaimedItemsForCustomer(customerId: string) {
  return shouldUseSupabase() ? listClaimedItemsForCustomerSupabase(customerId) : fallback.listClaimedItemsForCustomer(customerId);
}

export async function listArchivedInvoices() {
  return shouldUseSupabase() ? listArchivedInvoicesSupabase() : fallback.listArchivedInvoices();
}

export async function listArchivedInvoicesForCustomer(customerId: string) {
  return shouldUseSupabase() ? listArchivedInvoicesForCustomerSupabase(customerId) : fallback.listArchivedInvoicesForCustomer(customerId);
}

export async function listShipmentRecords() {
  return shouldUseSupabase() ? listShipmentRecordsSupabase() : fallback.listShipmentRecords();
}

export async function listShipmentRecordsForCustomer(customerId: string) {
  return shouldUseSupabase() ? listShipmentRecordsForCustomerSupabase(customerId) : fallback.listShipmentRecordsForCustomer(customerId);
}

export async function listPaymentHistoryForCustomer(customerId: string) {
  return shouldUseSupabase() ? listPaymentHistoryForCustomerSupabase(customerId) : fallback.listPaymentHistoryForCustomer(customerId);
}

export async function listClaimHistoryForCustomer(customerId: string) {
  return shouldUseSupabase() ? listClaimHistoryForCustomerSupabase(customerId) : fallback.listClaimHistoryForCustomer(customerId);
}

export async function listCustomerNotes(customerId?: string) {
  return shouldUseSupabase() ? listCustomerNotesSupabase(customerId) : fallback.listCustomerNotes(customerId);
}

export async function listCustomerMessagesForCustomer(customerId: string, options?: { limit?: number }) {
  return shouldUseSupabase()
    ? listCustomerMessagesForCustomerSupabase(customerId, options)
    : fallback.listCustomerMessagesForCustomer(customerId, options);
}

export async function listCustomerItemRequests(customerId?: string, options?: { limit?: number }) {
  return shouldUseSupabase()
    ? listCustomerItemRequestsSupabase(customerId, options)
    : fallback.listCustomerItemRequests(customerId, options);
}

export async function listRestockRequests(customerId?: string) {
  return shouldUseSupabase() ? listRestockRequestsSupabase(customerId) : fallback.listRestockRequests(customerId);
}

export async function listNotifications(options?: { includeRead?: boolean }) {
  return shouldUseSupabase() ? listNotificationsSupabase(options) : fallback.listNotifications(options);
}

export async function listAdminAuditEntries(limit?: number) {
  return shouldUseSupabase() ? listAdminAuditEntriesSupabase(limit) : fallback.listAdminAuditEntries(limit);
}

export async function listCrossListedInventory(search?: string) {
  return shouldUseSupabase() ? listCrossListedInventorySupabase(search) : fallback.listCrossListedInventory(search);
}

export async function listEvents() {
  return shouldUseSupabase() ? listEventsSupabase() : fallback.listEvents();
}

export async function getEventById(eventId: string) {
  return shouldUseSupabase() ? getEventByIdSupabase(eventId) : fallback.getEventById(eventId);
}

export async function getPaymentDefaults(customerId?: string) {
  return shouldUseSupabase() ? getPaymentDefaultsSupabase(customerId) : fallback.getPaymentDefaults();
}

export async function getFinancialSummary() {
  return shouldUseSupabase() ? getFinancialSummarySupabase() : fallback.getFinancialSummary();
}

export async function submitClaimToDatabase(productId: string, requestedQuantity: number) {
  return shouldUseSupabase()
    ? submitClaimToDatabaseSupabase(productId, requestedQuantity)
    : fallback.submitClaimToDatabase(productId, requestedQuantity);
}

export async function adjustInventoryInDatabase(productId: string, quantityChange: number) {
  return shouldUseSupabase()
    ? adjustInventoryInDatabaseSupabase(productId, quantityChange)
    : fallback.adjustInventoryInDatabase(productId, quantityChange);
}

export async function archiveProductInDatabase(productId: string) {
  return shouldUseSupabase()
    ? archiveProductInDatabaseSupabase(productId)
    : fallback.archiveProductInDatabase(productId);
}

export async function deleteArchivedProductInDatabase(productId: string) {
  return shouldUseSupabase()
    ? deleteArchivedProductInDatabaseSupabase(productId)
    : fallback.deleteArchivedProductInDatabase(productId);
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
  return shouldUseSupabase()
    ? createInventoryItemInDatabaseSupabase(input)
    : fallback.createInventoryItemInDatabase(input);
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
  return shouldUseSupabase()
    ? createInventoryItemsBulkInDatabaseSupabase(input)
    : fallback.createInventoryItemsBulkInDatabase(input);
}

export async function createCategoryInDatabase(name: string) {
  return shouldUseSupabase()
    ? createCategoryInDatabaseSupabase(name)
    : fallback.createCategoryInDatabase(name);
}

export async function deleteCategoryInDatabase(categoryId: string) {
  return shouldUseSupabase()
    ? deleteCategoryInDatabaseSupabase(categoryId)
    : fallback.deleteCategoryInDatabase(categoryId);
}

export async function updateProductSaleInDatabase(productId: string, salePercentage: number, saleEndsAt: string) {
  return shouldUseSupabase()
    ? updateProductSaleInDatabaseSupabase(productId, salePercentage, saleEndsAt)
    : fallback.updateProductSaleInDatabase(productId, salePercentage, saleEndsAt);
}

export async function clearProductSaleInDatabase(productId: string) {
  return shouldUseSupabase()
    ? clearProductSaleInDatabaseSupabase(productId)
    : fallback.clearProductSaleInDatabase(productId);
}

export async function updateHomepageFeaturedInDatabase(productId: string, featured: boolean) {
  return shouldUseSupabase()
    ? updateHomepageFeaturedInDatabaseSupabase(productId, featured)
    : fallback.updateHomepageFeaturedInDatabase(productId, featured);
}

export async function submitRestockRequestToDatabase(productId: string) {
  return shouldUseSupabase()
    ? submitRestockRequestToDatabaseSupabase(productId)
    : fallback.submitRestockRequestToDatabase(productId);
}

export async function submitCustomerMessageToDatabase(message: string) {
  return shouldUseSupabase()
    ? submitCustomerMessageToDatabaseSupabase(message)
    : fallback.submitCustomerMessageToDatabase(message);
}

export async function submitCustomerItemRequestToDatabase(request: string) {
  return shouldUseSupabase()
    ? submitCustomerItemRequestToDatabaseSupabase(request)
    : fallback.submitCustomerItemRequestToDatabase(request);
}

export async function replyToCustomerMessage(customerId: string, message: string) {
  return shouldUseSupabase()
    ? replyToCustomerMessageSupabase(customerId, message)
    : fallback.replyToCustomerMessage(customerId, message);
}

export async function submitShipmentRequestToDatabase() {
  return shouldUseSupabase()
    ? submitShipmentRequestToDatabaseSupabase()
    : fallback.submitShipmentRequestToDatabase();
}

export async function addCustomerToShipmentQueueInDatabase(customerId: string) {
  return shouldUseSupabase()
    ? addCustomerToShipmentQueueSupabase(customerId)
    : fallback.addCustomerToShipmentQueue(customerId);
}

export async function cancelShipmentRequestInDatabase(shipmentId?: string) {
  return shouldUseSupabase()
    ? cancelShipmentRequestInDatabaseSupabase(shipmentId)
    : fallback.cancelShipmentRequestInDatabase(shipmentId);
}

export async function updateShipmentInDatabase(
  shipmentId: string,
  nextStatus: Parameters<typeof fallback.updateShipmentInDatabase>[1],
  trackingNumber: string,
  shippingInvoice: string,
) {
  return shouldUseSupabase()
    ? updateShipmentInDatabaseSupabase(shipmentId, nextStatus, trackingNumber, shippingInvoice)
    : fallback.updateShipmentInDatabase(shipmentId, nextStatus, trackingNumber, shippingInvoice);
}

export async function updateCustomerAccountState(
  customerId: string,
  nextState: Parameters<typeof fallback.updateCustomerAccountState>[1],
) {
  return shouldUseSupabase()
    ? updateCustomerAccountStateSupabase(customerId, nextState)
    : fallback.updateCustomerAccountState(customerId, nextState);
}

export async function updateCustomerRoleInDatabase(customerId: string, nextRole: "admin") {
  return shouldUseSupabase()
    ? updateCustomerRoleInDatabaseSupabase(customerId, nextRole)
    : fallback.updateCustomerRoleInDatabase(customerId, nextRole);
}

export async function addCustomerNoteToDatabase(customerId: string, note: string) {
  return shouldUseSupabase()
    ? addCustomerNoteToDatabaseSupabase(customerId, note)
    : fallback.addCustomerNoteToDatabase(customerId, note);
}

export async function addManualBalanceItemToDatabase(title: string, quantity: number, unitPrice: number, recordedAt?: string, customerId?: string) {
  return shouldUseSupabase()
    ? addManualBalanceItemToDatabaseSupabase(title, quantity, unitPrice, recordedAt, customerId)
    : fallback.addManualBalanceItemToDatabase(title, quantity, unitPrice, recordedAt);
}

export async function updateClaimedItemInDatabase(claimId: string, quantity: number, unitPrice: number) {
  return shouldUseSupabase()
    ? updateClaimedItemInDatabaseSupabase(claimId, quantity, unitPrice)
    : fallback.updateClaimedItemInDatabase(claimId, quantity, unitPrice);
}

export async function removeClaimedItemFromDatabase(claimId: string) {
  return shouldUseSupabase()
    ? removeClaimedItemFromDatabaseSupabase(claimId)
    : fallback.removeClaimedItemFromDatabase(claimId);
}

export async function applyBalanceAdjustmentsToDatabase(shippingChange: number, adjustmentChange: number, customerId?: string) {
  return shouldUseSupabase()
    ? applyBalanceAdjustmentsToDatabaseSupabase(shippingChange, adjustmentChange, customerId)
    : fallback.applyBalanceAdjustmentsToDatabase(shippingChange, adjustmentChange);
}

export async function applyPaymentToDatabase(paymentAmount: number, creditAmount: number, recordedAt?: string, customerId?: string) {
  return shouldUseSupabase()
    ? applyPaymentToDatabaseSupabase(paymentAmount, creditAmount, recordedAt, customerId)
    : fallback.applyPaymentToDatabase(paymentAmount, creditAmount, recordedAt);
}

export async function updatePaymentInDatabase(paymentId: string, paymentAmount: number, recordedAt?: string) {
  return shouldUseSupabase()
    ? updatePaymentInDatabaseSupabase(paymentId, paymentAmount, recordedAt)
    : fallback.updatePaymentInDatabase(paymentId, paymentAmount, recordedAt);
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
  return shouldUseSupabase()
    ? createEventInDatabaseSupabase(input)
    : fallback.createEventInDatabase(input);
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
  return shouldUseSupabase()
    ? updateEventInDatabaseSupabase(input)
    : fallback.updateEventInDatabase(input);
}

export async function deleteEventInDatabase(eventId: string) {
  return shouldUseSupabase()
    ? deleteEventInDatabaseSupabase(eventId)
    : fallback.deleteEventInDatabase(eventId);
}

export async function markNotificationReadInDatabase(notificationId: string) {
  return shouldUseSupabase()
    ? markNotificationReadInDatabaseSupabase(notificationId)
    : fallback.markNotificationReadInDatabase(notificationId);
}

export async function saveCrossListedInventoryToDatabase(input: {
  sku: string;
  itemName: string;
  cost?: number | null;
  platforms: string[];
}) {
  return shouldUseSupabase()
    ? saveCrossListedInventoryToDatabaseSupabase(input)
    : fallback.saveCrossListedInventoryToDatabase(input);
}

export async function deleteCrossListedInventoryFromDatabase(recordId: string) {
  return shouldUseSupabase()
    ? deleteCrossListedInventoryFromDatabaseSupabase(recordId)
    : fallback.deleteCrossListedInventoryFromDatabase(recordId);
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
  return shouldUseSupabase()
    ? recordAdminAuditEntrySupabase(input)
    : fallback.recordAdminAuditEntry(input);
}

export { platformSummary };
