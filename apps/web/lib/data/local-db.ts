import "server-only";

import { assertProductionSupabaseReady, hasSupabaseEnv } from "../supabase";
import { platformSummary } from "@fatguydiscounts/db";
import * as fallback from "./local-db-fallback";
import {
  getBalanceCycleSupabase,
  getCurrentCustomerSupabase,
  getFinancialSummarySupabase,
  getEventByIdSupabase,
  getPaymentDefaultsSupabase,
  getPlatformSummarySupabase,
  listArchivedInvoicesSupabase,
  listClaimedItemsSupabase,
  listClaimedItemsForCustomerSupabase,
  listCustomerNotesSupabase,
  listCustomersSupabase,
  listEventsSupabase,
  listNotificationsSupabase,
  listProductsSupabase,
  listRestockRequestsSupabase,
  listShipmentRecordsSupabase,
} from "./supabase-reads";
import {
  addCustomerNoteToDatabaseSupabase,
  addManualBalanceItemToDatabaseSupabase,
  adjustInventoryInDatabaseSupabase,
  applyBalanceAdjustmentsToDatabaseSupabase,
  applyPaymentToDatabaseSupabase,
  clearProductSaleInDatabaseSupabase,
  createInventoryItemInDatabaseSupabase,
  removeClaimedItemFromDatabaseSupabase,
  submitClaimToDatabaseSupabase,
  submitRestockRequestToDatabaseSupabase,
  submitShipmentRequestToDatabaseSupabase,
  updateProductSaleInDatabaseSupabase,
  updateClaimedItemInDatabaseSupabase,
  updateCurrentCustomerProfileSupabase,
  updateCustomerAccountStateSupabase,
  updateCustomerRoleInDatabaseSupabase,
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

export async function listProducts() {
  return shouldUseSupabase() ? listProductsSupabase() : fallback.listProducts();
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

export async function getBalanceCycle() {
  return shouldUseSupabase() ? getBalanceCycleSupabase() : fallback.getBalanceCycle();
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

export async function listShipmentRecords() {
  return shouldUseSupabase() ? listShipmentRecordsSupabase() : fallback.listShipmentRecords();
}

export async function listCustomerNotes(customerId?: string) {
  return shouldUseSupabase() ? listCustomerNotesSupabase(customerId) : fallback.listCustomerNotes(customerId);
}

export async function listRestockRequests(customerId?: string) {
  return shouldUseSupabase() ? listRestockRequestsSupabase(customerId) : fallback.listRestockRequests(customerId);
}

export async function listNotifications() {
  return shouldUseSupabase() ? listNotificationsSupabase() : fallback.listNotifications();
}

export async function listEvents() {
  return shouldUseSupabase() ? listEventsSupabase() : fallback.listEvents();
}

export async function getEventById(eventId: string) {
  return shouldUseSupabase() ? getEventByIdSupabase(eventId) : fallback.getEventById(eventId);
}

export async function getPaymentDefaults() {
  return shouldUseSupabase() ? getPaymentDefaultsSupabase() : fallback.getPaymentDefaults();
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

export async function createInventoryItemInDatabase(input: {
  title: string;
  description: string;
  price: number;
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

export async function submitRestockRequestToDatabase(productId: string) {
  return shouldUseSupabase()
    ? submitRestockRequestToDatabaseSupabase(productId)
    : fallback.submitRestockRequestToDatabase(productId);
}

export async function submitShipmentRequestToDatabase() {
  return shouldUseSupabase()
    ? submitShipmentRequestToDatabaseSupabase()
    : fallback.submitShipmentRequestToDatabase();
}

export async function updateShipmentInDatabase(
  shipmentId: string,
  nextStatus: Parameters<typeof fallback.updateShipmentInDatabase>[1],
  trackingNumber: string,
) {
  return shouldUseSupabase()
    ? updateShipmentInDatabaseSupabase(shipmentId, nextStatus, trackingNumber)
    : fallback.updateShipmentInDatabase(shipmentId, nextStatus, trackingNumber);
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

export async function addManualBalanceItemToDatabase(title: string, quantity: number, unitPrice: number) {
  return shouldUseSupabase()
    ? addManualBalanceItemToDatabaseSupabase(title, quantity, unitPrice)
    : fallback.addManualBalanceItemToDatabase(title, quantity, unitPrice);
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

export async function applyBalanceAdjustmentsToDatabase(shippingChange: number, adjustmentChange: number) {
  return shouldUseSupabase()
    ? applyBalanceAdjustmentsToDatabaseSupabase(shippingChange, adjustmentChange)
    : fallback.applyBalanceAdjustmentsToDatabase(shippingChange, adjustmentChange);
}

export async function applyPaymentToDatabase(paymentAmount: number, creditAmount: number) {
  return shouldUseSupabase()
    ? applyPaymentToDatabaseSupabase(paymentAmount, creditAmount)
    : fallback.applyPaymentToDatabase(paymentAmount, creditAmount);
}

export async function createEventInDatabase(input: {
  title: string;
  startsAtLocal: string;
  description: string;
  externalLink: string;
  platform: string;
  timeZone: string;
}) {
  return shouldUseSupabase()
    ? createEventInDatabaseSupabase(input)
    : fallback.createEventInDatabase(input);
}

export { platformSummary };
