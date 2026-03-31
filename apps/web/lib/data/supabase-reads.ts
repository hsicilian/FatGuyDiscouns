import "server-only";

import { platformSummary } from "@fatguydiscounts/db";
import type { AdminNotification, CategoryOption, ClaimedItem, CustomerNote, FinancialSummary, RestockRequestRecord, ShipmentRecord } from "@fatguydiscounts/types";
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
  const context = await getTargetCycleContext();
  if (!context) return [] as ClaimedItem[];

  const admin = await getAdminClient();
  const { data, error } = await admin
    .from("balance_line_items")
    .select("id, description, quantity, unit_price, status, item_type")
    .eq("cycle_id", context.cycle.id)
    .in("item_type", ["claim", "manual_item", "manual_adjustment"])
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => toClaimedItem(row as Record<string, any>));
}

export async function listClaimedItemsForCustomerSupabase(customerId: string) {
  const admin = await getAdminClient();
  const { data: cycle } = await admin
    .from("balance_cycles")
    .select("id")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!cycle?.id) return [] as ClaimedItem[];

  const { data, error } = await admin
    .from("balance_line_items")
    .select("id, description, quantity, unit_price, status, item_type")
    .eq("cycle_id", cycle.id)
    .in("item_type", ["claim", "manual_item", "manual_adjustment"])
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
    customerName: customerMap.get(row.customer_id)?.displayName ?? "Customer",
    status: row.status,
    requestedAt: row.requested_at,
    trackingNumber: row.tracking_number,
    shipmentDate: row.shipment_date,
  } satisfies ShipmentRecord));
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

  return (data ?? []).map((row) => {
    const productRelation = (row as any).products;
    return ({
      id: row.id,
      customerId: row.customer_id,
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
