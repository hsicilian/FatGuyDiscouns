import "server-only";

import { platformSummary } from "@fatguydiscounts/db";
import type {
  AdminNotification,
  ArchivedInvoice,
  CategoryOption,
  ClaimedItem,
  ClaimHistoryRecord,
  CrossListedInventoryRecord,
  CustomerItemRequestRecord,
  CustomerMessageRecord,
  CustomerNote,
  FinancialSummary,
  PaymentHistoryRecord,
  RestockRequestRecord,
  ShipmentRecord,
} from "@fatguydiscounts/types";
import {
  ZERO_CYCLE,
  formatNotificationLabel,
  getAdminClient,
  getCurrentActor,
  getCustomerSummaryByUserId,
  getFinancialSummaryFromCycles,
  getSessionClient,
  getTargetCycleContext,
  toArchivedInvoice,
  toClaimedItem,
  toClaimHistoryRecord,
  toCustomerMessageRecord,
  toPaymentHistoryRecord,
  toProduct,
  toShowEvent,
} from "./supabase-helpers";
import { isUuidLike, productMatchesLookup } from "../products";

async function attachProductImages(
  client: Awaited<ReturnType<typeof getAdminClient>>,
  rows: Array<Record<string, any>>,
) {
  if (rows.length === 0) {
    return rows;
  }

  const productIds = rows.map((row) => row.id).filter((value): value is string => typeof value === "string");
  if (productIds.length === 0) {
    return rows;
  }

  const { data: imageRows, error } = await client
    .from("product_images")
    .select("id, product_id, image_url, position")
    .in("product_id", productIds)
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  const imageMap = new Map<string, Array<Record<string, any>>>();
  for (const imageRow of imageRows ?? []) {
    const existing = imageMap.get(imageRow.product_id) ?? [];
    existing.push(imageRow as Record<string, any>);
    imageMap.set(imageRow.product_id, existing);
  }

  return rows.map((row) => ({
    ...row,
    product_images: imageMap.get(row.id) ?? [],
  }));
}

export async function getPlatformSummarySupabase() {
  return platformSummary;
}

export async function listCategoriesSupabase(): Promise<CategoryOption[]> {
  const client = await getAdminClient();
  const { data, error } = await client
    .from("categories")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
  }));
}

export async function listProductsSupabase(options?: { includeArchived?: boolean }) {
  const actor = await getCurrentActor().catch(() => null);
  const client = await getAdminClient();
  let query = client.from("products").select("id, title, description, price, sale_percentage, sale_ends_at, archived_at, inventory_quantity, status, categories(name)");

  if (options?.includeArchived) {
    query = query.eq("status", "archived");
  } else if (!actor || actor.role === "customer") {
    query = query.in("status", ["active", "low_stock", "out_of_stock"]);
  } else {
    query = query.in("status", ["draft", "active", "low_stock", "out_of_stock", "hidden"]);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  const rowsWithImages = await attachProductImages(client, (data ?? []) as Array<Record<string, any>>);
  return rowsWithImages.map((row) => toProduct(row));
}

export async function getProductByIdSupabase(productId: string) {
  const actor = await getCurrentActor().catch(() => null);
  const client = await getAdminClient();
  if (isUuidLike(productId)) {
    let query = client
      .from("products")
      .select("id, title, description, price, sale_percentage, sale_ends_at, archived_at, inventory_quantity, status, categories(name), product_images(id, image_url, position)")
      .eq("id", productId);

    if (!actor || actor.role === "customer") {
      query = query.in("status", ["active", "low_stock", "out_of_stock"]);
    } else {
      query = query.in("status", ["draft", "active", "low_stock", "out_of_stock", "hidden"]);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (data) {
      return toProduct(data as Record<string, any>);
    }
  }

  let fallbackQuery = client
    .from("products")
    .select("id, title, description, price, sale_percentage, sale_ends_at, archived_at, inventory_quantity, status, categories(name)")
    .order("created_at", { ascending: false });

  if (!actor || actor.role === "customer") {
    fallbackQuery = fallbackQuery.in("status", ["active", "low_stock", "out_of_stock"]);
  } else {
    fallbackQuery = fallbackQuery.in("status", ["draft", "active", "low_stock", "out_of_stock", "hidden"]);
  }

  const { data: fallbackRows, error: fallbackError } = await fallbackQuery;
  if (fallbackError) throw fallbackError;

  const rowsWithImages = await attachProductImages(client, (fallbackRows ?? []) as Array<Record<string, any>>);
  const matchedRow = rowsWithImages.find((row) => productMatchesLookup(String(row.id), productId));
  return matchedRow ? toProduct(matchedRow) : null;
}

export async function getCurrentCustomerSupabase() {
  const actor = await getCurrentActor();
  if (actor.role !== "customer") {
    throw new Error("Customer session required.");
  }
  return getCustomerSummaryByUserId(actor.id);
}

export async function listCustomersSupabase() {
  const admin = await getAdminClient();
  const { data, error } = await admin.from("user_roles").select("user_id");
  if (error) throw error;
  return Promise.all((data ?? []).map((row) => getCustomerSummaryByUserId(row.user_id, { admin: true })));
}

export async function getBalanceCycleSupabase(customerId?: string) {
  const context = await getTargetCycleContext(customerId);
  return context?.summary ?? ZERO_CYCLE;
}

export async function listClaimedItemsSupabase() {
  const actor = await getCurrentActor();
  if (actor.role !== "customer") return [] as ClaimedItem[];
  const admin = await getAdminClient();
  const { data, error } = await admin
    .from("balance_line_items")
    .select("id, description, quantity, unit_price, status, item_type, balance_cycles!inner(customer_id)")
    .in("item_type", ["claim", "manual_item", "manual_adjustment"])
    .eq("balance_cycles.customer_id", actor.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => toClaimedItem(row as Record<string, any>));
}

export async function listClaimedItemsForCustomerSupabase(customerId: string) {
  const admin = await getAdminClient();
  const { data, error } = await admin
    .from("balance_line_items")
    .select("id, description, quantity, unit_price, status, item_type, balance_cycles!inner(customer_id)")
    .in("item_type", ["claim", "manual_item", "manual_adjustment"])
    .eq("balance_cycles.customer_id", customerId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => toClaimedItem(row as Record<string, any>));
}

export async function listArchivedInvoicesSupabase() {
  const actor = await getCurrentActor();
  if (actor.role !== "customer") return [];

  const admin = await getAdminClient();
  const { data, error } = await admin
    .from("archived_invoices")
    .select("id, cycle_label, paid_at, total, payment_total, credit_applied")
    .eq("customer_id", actor.id)
    .order("paid_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => toArchivedInvoice(row as Record<string, any>));
}

export async function listArchivedInvoicesForCustomerSupabase(customerId: string): Promise<ArchivedInvoice[]> {
  const admin = await getAdminClient();
  const { data, error } = await admin
    .from("archived_invoices")
    .select("id, cycle_label, paid_at, total, payment_total, credit_applied")
    .eq("customer_id", customerId)
    .order("paid_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => toArchivedInvoice(row as Record<string, any>));
}

export async function listPaymentHistoryForCustomerSupabase(customerId: string): Promise<PaymentHistoryRecord[]> {
  const admin = await getAdminClient();
  const { data, error } = await admin
    .from("payments")
    .select("id, amount, created_at, notes, balance_cycles!inner(customer_id)")
    .eq("balance_cycles.customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => toPaymentHistoryRecord(row as Record<string, any>));
}

export async function listClaimHistoryForCustomerSupabase(customerId: string): Promise<ClaimHistoryRecord[]> {
  const admin = await getAdminClient();
  const { data, error } = await admin
    .from("balance_line_items")
    .select("id, description, quantity, unit_price, status, item_type, created_at, balance_cycles!inner(customer_id, status)")
    .in("item_type", ["claim", "manual_item", "manual_adjustment"])
    .eq("balance_cycles.customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => toClaimHistoryRecord(row as Record<string, any>));
}

export async function listShipmentRecordsSupabase() {
  const admin = await getAdminClient();
  const { data, error } = await admin
    .from("shipments")
    .select("id, customer_id, status, requested_at, tracking_number, shipment_date")
    .order("requested_at", { ascending: false });

  if (error) throw error;

  const customerIds = [...new Set((data ?? []).map((shipment) => shipment.customer_id).filter(Boolean))];
  const customerMap = new Map<string, Awaited<ReturnType<typeof getCustomerSummaryByUserId>>>();
  await Promise.all(customerIds.map(async (customerId) => {
    customerMap.set(customerId, await getCustomerSummaryByUserId(customerId, { admin: true }));
  }));

  return (data ?? []).map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    customerName: customerMap.get(row.customer_id)?.displayName ?? "Customer",
    status: row.status,
    requestedAt: row.requested_at,
    trackingNumber: row.tracking_number,
    shipmentDate: row.shipment_date,
  } satisfies ShipmentRecord));
}

export async function listShipmentRecordsForCustomerSupabase(customerId: string) {
  const shipments = await listShipmentRecordsSupabase();
  return shipments.filter((shipment) => shipment.customerId === customerId);
}

export async function listCustomerNotesSupabase(customerId?: string) {
  const admin = await getAdminClient();
  let query = admin.from("customer_notes").select("id, customer_id, body, created_at").order("created_at", { ascending: false });
  if (customerId) query = query.eq("customer_id", customerId);
  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    note: row.body,
    createdAt: row.created_at,
  } satisfies CustomerNote));
}

export async function listCustomerMessagesForCustomerSupabase(
  customerId: string,
  options?: { limit?: number },
): Promise<CustomerMessageRecord[]> {
  const admin = await getAdminClient();
  let query = admin
    .from("customer_messages")
    .select("id, customer_id, body, sender_role, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => toCustomerMessageRecord(row as Record<string, any>));
}

export async function listCustomerItemRequestsSupabase(
  customerId?: string,
  options?: { limit?: number },
): Promise<CustomerItemRequestRecord[]> {
  const admin = await getAdminClient();
  let query = admin
    .from("customer_item_requests")
    .select("id, customer_id, body, status, created_at")
    .order("created_at", { ascending: false });

  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  const customerIds = [...new Set((data ?? []).map((row) => row.customer_id).filter(Boolean))];
  const customerMap = new Map<string, Awaited<ReturnType<typeof getCustomerSummaryByUserId>>>();
  await Promise.all(customerIds.map(async (id) => {
    customerMap.set(id, await getCustomerSummaryByUserId(id, { admin: true }));
  }));

  return (data ?? []).map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    customerName: customerMap.get(row.customer_id)?.displayName,
    request: row.body ?? "",
    status: row.status ?? "open",
    createdAt: row.created_at ?? new Date().toISOString(),
  } satisfies CustomerItemRequestRecord));
}

export async function listRestockRequestsSupabase(customerId?: string) {
  const admin = await getAdminClient();
  let query = admin
    .from("restock_requests")
    .select("id, customer_id, email, status, created_at, products(title)")
    .order("created_at", { ascending: false });

  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const customerIds = [...new Set((data ?? []).map((row) => row.customer_id).filter(Boolean))];
  const customerMap = new Map<string, Awaited<ReturnType<typeof getCustomerSummaryByUserId>>>();
  await Promise.all(customerIds.map(async (id) => {
    customerMap.set(id, await getCustomerSummaryByUserId(id, { admin: true }));
  }));

  return (data ?? []).map((row) => {
    const productRelation = (row as any).products;
    return ({
      id: row.id,
      customerId: row.customer_id,
      customerName: row.customer_id ? customerMap.get(row.customer_id)?.displayName : undefined,
      productTitle: Array.isArray(productRelation) ? productRelation[0]?.title ?? "Product" : productRelation?.title ?? "Product",
      status: row.status,
      createdAt: row.created_at,
      email: row.email ?? null,
    } satisfies RestockRequestRecord);
  });
}

export async function listNotificationsSupabase(options?: { includeRead?: boolean }) {
  const admin = await getAdminClient();
  let query = admin
    .from("notifications")
    .select("id, type, payload, created_at, customer_id, read_at")
    .order("created_at", { ascending: false })
    .limit(options?.includeRead ? 100 : 30);

  if (!options?.includeRead) {
    query = query.is("read_at", null);
  }

  const { data, error } = await query;
  if (error) throw error;

  const customerIds = [...new Set((data ?? []).map((row) => row.customer_id).filter(Boolean))];
  const customerMap = new Map<string, Awaited<ReturnType<typeof getCustomerSummaryByUserId>>>();
  await Promise.all(customerIds.map(async (customerId) => {
    customerMap.set(customerId, await getCustomerSummaryByUserId(customerId, { admin: true }));
  }));

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    label: formatNotificationLabel({
      ...row,
      payload: row.payload ?? {},
      customerName: row.customer_id ? customerMap.get(row.customer_id)?.displayName : undefined,
    } as Record<string, any>),
    createdAt: row.created_at,
    readAt: row.read_at ?? null,
  } satisfies AdminNotification));
}

export async function listCrossListedInventorySupabase(search?: string): Promise<CrossListedInventoryRecord[]> {
  const admin = await getAdminClient();
  const baseQuery = admin
    .from("cross_listed_inventory")
    .select("id, sku, item_name, platforms, platform_dates, updated_at")
    .order("updated_at", { ascending: false });

  const trimmedSearch = search?.trim();
  const { data, error } = await baseQuery;
  if (error) throw error;

  const records = (data ?? []).map((row) => ({
    id: row.id,
    sku: row.sku ?? "",
    itemName: row.item_name ?? "",
    platforms: Array.isArray(row.platforms) ? row.platforms : [],
    platformDates: row.platform_dates && typeof row.platform_dates === "object" ? row.platform_dates : {},
    updatedAt: row.updated_at ?? new Date().toISOString(),
  } satisfies CrossListedInventoryRecord));

  if (!trimmedSearch) {
    return records;
  }

  const loweredSearch = trimmedSearch.toLowerCase();
  return records.filter((record) =>
    record.sku.toLowerCase().includes(loweredSearch)
    || record.itemName.toLowerCase().includes(loweredSearch)
    || record.platforms.some((platform) => platform.toLowerCase().includes(loweredSearch))
  );
}

export async function listEventsSupabase() {
  const admin = await getAdminClient();
  const { data, error } = await admin.from("events").select("*").order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => toShowEvent(row as Record<string, any>));
}

export async function getEventByIdSupabase(eventId: string) {
  const admin = await getAdminClient();
  const { data, error } = await admin.from("events").select("*").eq("id", eventId).maybeSingle();
  if (error) throw error;
  return data ? toShowEvent(data as Record<string, any>) : null;
}

export async function getPaymentDefaultsSupabase(customerId?: string) {
  const context = await getTargetCycleContext(customerId);
  if (!context) {
    return { paymentAmount: 0, creditAmount: 0 };
  }

  const customer = await getCustomerSummaryByUserId(context.cycle.customer_id, { admin: true });
  const due = context.summary.subtotal + context.summary.shipping + context.summary.adjustments - context.summary.paymentsApplied - context.summary.creditsApplied;
  return {
    paymentAmount: 0,
    creditAmount: Math.min(customer.creditBalance, Math.max(due, 0)),
  };
}

export async function getFinancialSummarySupabase(): Promise<FinancialSummary> {
  return getFinancialSummaryFromCycles();
}
