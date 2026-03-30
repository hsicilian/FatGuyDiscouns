import "server-only";

import { assertProductionSupabaseReady, hasSupabaseEnv } from "../supabase";
import { platformSummary } from "@fatguydiscounts/db";
import * as fallback from "./local-db-fallback";
import {
  getBalanceCycleSupabase,
  getCurrentCustomerSupabase,
  getFinancialSummarySupabase,
  getPaymentDefaultsSupabase,
  getPlatformSummarySupabase,
  listArchivedInvoicesSupabase,
  listClaimedItemsSupabase,
  listCustomerNotesSupabase,
  listCustomersSupabase,
  listEventsSupabase,
  listNotificationsSupabase,
  listProductsSupabase,
  listShipmentRecordsSupabase,
} from "./supabase-reads";
import {
  addCustomerNoteToDatabaseSupabase,
  addManualBalanceItemToDatabaseSupabase,
  adjustInventoryInDatabaseSupabase,
  applyBalanceAdjustmentsToDatabaseSupabase,
  applyPaymentToDatabaseSupabase,
  removeClaimedItemFromDatabaseSupabase,
  submitClaimToDatabaseSupabase,
  submitRestockRequestToDatabaseSupabase,
  submitShipmentRequestToDatabaseSupabase,
  updateClaimedItemInDatabaseSupabase,
  updateCurrentCustomerProfileSupabase,
  updateCustomerAccountStateSupabase,
  updateCustomerRoleInDatabaseSupabase,
  updateShipmentInDatabaseSupabase,
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
  timezone?: string;
  address?: string;
}) {
  return fallback.createPendingCustomerProfile(input);
}

export async function removeCustomerProfileById(customerId: string) {
  return fallback.removeCustomerProfileById(customerId);
}

export async function updateCurrentCustomerProfile(input: { address: string; timezone: string }) {
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

export async function listArchivedInvoices() {
  return shouldUseSupabase() ? listArchivedInvoicesSupabase() : fallback.listArchivedInvoices();
}

export async function listShipmentRecords() {
  return shouldUseSupabase() ? listShipmentRecordsSupabase() : fallback.listShipmentRecords();
}

export async function listCustomerNotes(customerId?: string) {
  return shouldUseSupabase() ? listCustomerNotesSupabase(customerId) : fallback.listCustomerNotes(customerId);
}

export async function listNotifications() {
  return shouldUseSupabase() ? listNotificationsSupabase() : fallback.listNotifications();
}

export async function listEvents() {
  return shouldUseSupabase() ? listEventsSupabase() : fallback.listEvents();
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

export { platformSummary };
