import "server-only";

import { calculateBalanceDue, getSalePrice, getScheduledDueDateForDate, isBalanceOverdue, isSaleActive } from "@fatguydiscounts/core";
import type {
  ArchivedInvoice,
  BalanceCycleSummary,
  ClaimedItem,
  ClaimHistoryRecord,
  CustomerMessageRecord,
  CustomerSummary,
  FinancialSummary,
  PaymentHistoryRecord,
  Product,
  ProductImageRecord,
  ShowEvent,
} from "@fatguydiscounts/types";
import { getCurrentSessionUser } from "../auth/session";
import { createServerSupabaseClient, createSupabaseAdminClient } from "../supabase";

export const ZERO_CYCLE: BalanceCycleSummary = {
  id: "no-active-cycle",
  status: "active",
  dueDate: getScheduledDueDateForDate(new Date().toISOString().slice(0, 10)),
  subtotal: 0,
  shipping: 0,
  adjustments: 0,
  paymentsApplied: 0,
  creditsApplied: 0,
};

export function siteToday() {
  return new Date().toISOString().slice(0, 10);
}

export function nextDueDateFromToday() {
  return getScheduledDueDateForDate(siteToday());
}

export function dueDateForReferenceDate(referenceDate?: string) {
  const normalized = typeof referenceDate === "string" ? referenceDate.trim().slice(0, 10) : "";
  return getScheduledDueDateForDate(normalized || siteToday());
}

export function formatCycleLabel(date: Date) {
  return `${date.toLocaleString("en-US", { month: "long" })} ${date.getFullYear()} cycle`;
}

export function formatAddress(address: Record<string, unknown> | null | undefined) {
  if (!address) {
    return "No address on file yet";
  }

  const parts = [address.line1, address.line2, address.city, address.region, address.postal_code]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "No address on file yet";
}

export function getAddressParts(address: Record<string, any> | null | undefined) {
  return {
    street: typeof address?.line1 === "string" ? address.line1 : "",
    city: typeof address?.city === "string" ? address.city : "",
    region: typeof address?.region === "string" ? address.region : "",
    postalCode: typeof address?.postal_code === "string" ? address.postal_code : "",
  };
}

export function formatNotificationLabel(row: Record<string, any>) {
  return row?.payload?.label ?? row?.payload?.title ?? row?.type?.replaceAll("_", " ") ?? "Notification";
}

export function toProduct(row: Record<string, any>): Product {
  const originalPrice = Number(row.price ?? 0);
  const salePercentage = row.sale_percentage == null ? null : Number(row.sale_percentage);
  const saleEndsAt = row.sale_ends_at ?? null;
  const salePrice = getSalePrice(originalPrice, salePercentage, saleEndsAt);
  const rawImageRows = row.product_images;
  const imageRows = Array.isArray(rawImageRows)
    ? rawImageRows
    : rawImageRows && typeof rawImageRows === "object"
      ? [rawImageRows]
      : [];
  const normalizedImageRows = imageRows
    .sort((left, right) => Number(left?.position ?? 0) - Number(right?.position ?? 0))
    .map((image, index) => ({
      id: typeof image?.id === "string" && image.id.length > 0 ? image.id : `${row.id}-image-${index}`,
      url: typeof image?.image_url === "string" ? image.image_url : "",
      position: Number(image?.position ?? index),
    }))
    .filter((image): image is ProductImageRecord => image.url.length > 0);
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    price: salePrice ?? originalPrice,
    originalPrice,
    salePrice,
    salePercentage,
    saleEndsAt,
    isOnSale: isSaleActive(salePercentage, saleEndsAt),
    archivedAt: row.archived_at ?? null,
    category: row.categories?.name ?? "Uncategorized",
    quantity: Number(row.inventory_quantity ?? 0),
    status: row.status,
    homepageFeatured: Boolean(row.homepage_featured),
    images: normalizedImageRows.map((image) => image.url),
    imageRecords: normalizedImageRows,
  };
}

export function toClaimedItem(row: Record<string, any>): ClaimedItem {
  return {
    id: row.id,
    productTitle: row.description,
    quantity: Number(row.quantity ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
    status: row.status === "claimed" ? "claimed" : "adjusted",
  };
}

export function toClaimHistoryRecord(row: Record<string, any>): ClaimHistoryRecord {
  return {
    id: row.id,
    productTitle: row.description,
    quantity: Number(row.quantity ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
    status: row.status === "claimed" ? "claimed" : "adjusted",
    createdAt: row.created_at ?? new Date().toISOString(),
    cycleStatus: row.balance_cycles?.status ?? undefined,
  };
}

export function toArchivedInvoice(row: Record<string, any>): ArchivedInvoice {
  return {
    id: row.id,
    cycleLabel: row.cycle_label,
    paidAt: row.paid_at,
    total: Number(row.total ?? 0),
    paymentTotal: Number(row.payment_total ?? 0),
    creditApplied: Number(row.credit_applied ?? 0),
  };
}

export function toPaymentHistoryRecord(row: Record<string, any>): PaymentHistoryRecord {
  return {
    id: row.id,
    customerId: row.balance_cycles?.customer_id ?? "",
    amount: Number(row.amount ?? 0),
    createdAt: row.created_at ?? new Date().toISOString(),
    notes: row.notes ?? "",
  };
}

export function toCustomerMessageRecord(row: Record<string, any>): CustomerMessageRecord {
  return {
    id: row.id,
    customerId: row.customer_id ?? "",
    customerName: row.customer_profiles?.display_name ?? undefined,
    senderRole: row.sender_role === "admin" ? "admin" : "customer",
    message: row.body ?? "",
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export function toShowEvent(row: Record<string, any>): ShowEvent {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    description: row.description ?? "",
    externalLink: row.external_link ?? "",
    platform: row.platform ?? undefined,
  };
}

export function mapBalanceCycle(
  row: Record<string, any>,
  subtotal: number,
  customer?: { id?: string; displayName?: string },
): BalanceCycleSummary {
  return {
    id: row.id,
    status: row.status,
    dueDate: getScheduledDueDateForDate((row.created_at ?? row.updated_at ?? siteToday()).slice(0, 10)),
    subtotal,
    shipping: Number(row.shipping_total ?? 0),
    adjustments: Number(row.adjustments_total ?? 0),
    paymentsApplied: Number(row.payments_applied ?? 0),
    creditsApplied: Number(row.credits_applied ?? 0),
    customerId: customer?.id ?? row.customer_id ?? undefined,
    customerName: customer?.displayName ?? undefined,
  };
}

export async function getCurrentActor() {
  const actor = await getCurrentSessionUser();
  if (!actor) {
    throw new Error("Authenticated session required.");
  }
  return actor;
}

export async function getAdminClient() {
  return createSupabaseAdminClient();
}

export async function getSessionClient() {
  return createServerSupabaseClient();
}

export async function getCycleSubtotal(cycleId: string, options?: { admin?: boolean }) {
  const client = options?.admin ? await getAdminClient() : await getSessionClient();
  const { data, error } = await client
    .from("balance_line_items")
    .select("quantity, unit_price")
    .eq("cycle_id", cycleId)
    .neq("status", "archived");

  if (error) {
    throw error;
  }

  return (data ?? []).reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0), 0);
}

export async function getSupabaseCycleRow(customerId?: string, options?: { dueDate?: string }) {
  const actor = await getCurrentActor();
  const dueDate = options?.dueDate?.trim();

  if (customerId) {
    const admin = await getAdminClient();
    let query = admin.from("balance_cycles").select("*").eq("customer_id", customerId).eq("status", "active");
    if (dueDate) query = query.eq("due_date", dueDate);
    const { data } = await query.order("updated_at", { ascending: false }).limit(1).maybeSingle();
    return data;
  }

  if (actor.role === "customer") {
    const admin = await getAdminClient();
    let query = admin.from("balance_cycles").select("*").eq("customer_id", actor.id).eq("status", "active");
    if (dueDate) query = query.eq("due_date", dueDate);
    const { data } = await query.order("updated_at", { ascending: false }).limit(1).maybeSingle();
    return data;
  }

  const admin = await getAdminClient();
  let query = admin.from("balance_cycles").select("*").eq("status", "active");
  if (dueDate) query = query.eq("due_date", dueDate);
  const { data } = await query.order("updated_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

export async function ensureActiveCycle(customerId: string, dueDate = nextDueDateFromToday()) {
  const admin = await getAdminClient();
  const existing = await getSupabaseCycleRow(customerId, { dueDate });
  if (existing) {
    return existing;
  }

  const { data, error } = await admin.from("balance_cycles").insert({ customer_id: customerId, status: "active", due_date: dueDate, shipping_total: 0, adjustments_total: 0, payments_applied: 0, credits_applied: 0 }).select("*").single();
  if (error) {
    throw error;
  }
  return data;
}

export async function getTargetCycleContext(customerId?: string, options?: { dueDate?: string; ensureIfMissing?: boolean }) {
  let cycle = await getSupabaseCycleRow(customerId, { dueDate: options?.dueDate });
  if (!cycle && options?.ensureIfMissing && customerId) {
    cycle = await ensureActiveCycle(customerId, options.dueDate || nextDueDateFromToday());
  }
  if (!cycle) {
    return null;
  }

  const customer = await getCustomerSummaryByUserId(cycle.customer_id, { admin: true });
  const subtotal = await getCycleSubtotal(cycle.id, { admin: true });
  return { cycle, summary: mapBalanceCycle(cycle as Record<string, any>, subtotal, { id: customer.id, displayName: customer.displayName }) };
}

export async function getCustomerSummaryByUserId(userId: string, options?: { admin?: boolean }) {
  const client = await getAdminClient();

  const [{ data: roleRow }, { data: profileRow }, { data: addressRow }, { data: shipmentRow }] = await Promise.all([
    client.from("user_roles").select("role, account_state").eq("user_id", userId).single(),
    client.from("customer_profiles").select("display_name, timezone, credit_balance, last_shipment_date").eq("user_id", userId).single(),
    client
      .from("addresses")
      .select("line1, line2, city, region, postal_code")
      .eq("user_id", userId)
      .eq("is_default", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client.from("shipments").select("status, shipment_date, requested_at").eq("customer_id", userId).order("requested_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const authEmail = (await (client as any).auth.admin.getUserById(userId)).data.user?.email;
  const displayName = profileRow?.display_name ?? authEmail ?? "Customer";
  const addressParts = getAddressParts(addressRow as Record<string, any> | null);

  return {
    id: userId,
    displayName,
    email: authEmail ?? "",
    role: roleRow?.role ?? "customer",
    accountState: roleRow?.account_state ?? "pending_approval",
    timezone: profileRow?.timezone ?? "America/New_York",
    address: formatAddress(addressRow as Record<string, unknown> | null),
    street: addressParts.street,
    city: addressParts.city,
    region: addressParts.region,
    postalCode: addressParts.postalCode,
    creditBalance: Number(profileRow?.credit_balance ?? 0),
    shipmentStatus: shipmentRow?.status ?? "none",
    lastShipmentDate: profileRow?.last_shipment_date ?? shipmentRow?.shipment_date ?? null,
  } satisfies CustomerSummary;
}

export async function getFinancialSummaryFromCycles() {
  const admin = await getAdminClient();
  const { data: cycles, error } = await admin.from("balance_cycles").select("*").eq("status", "active");
  if (error) {
    throw error;
  }

  const activeCustomerIds = [...new Set((cycles ?? []).map((cycle) => cycle.customer_id).filter(Boolean))];

  const customerBalances = (await Promise.all(activeCustomerIds.map(async (customerId) => {
    const context = await getTargetCycleContext(customerId);
    if (!context) {
      return null;
    }

    const customer = await getCustomerSummaryByUserId(customerId, { admin: true });
    const summary = context.summary;
    const invoiceAmount = Math.max(
      summary.subtotal + summary.adjustments - summary.paymentsApplied - summary.creditsApplied,
      0,
    );
    const shippingAmount = Math.max(summary.shipping, 0);
    return {
      customer: customer.displayName,
      customerId: customer.id,
      amount: invoiceAmount + shippingAmount,
      invoiceAmount,
      shippingAmount,
      overdue: isBalanceOverdue(summary, siteToday()),
    };
  }))).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const [{ data: archivedInvoices, error: archivedError }, { data: payments, error: paymentError }] = await Promise.all([
    admin
      .from("archived_invoices")
      .select("id, customer_id, cycle_label, paid_at, total, payment_total, credit_applied")
      .order("paid_at", { ascending: false }),
    admin
      .from("payments")
      .select("id, amount, created_at, notes, balance_cycles!inner(customer_id)")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  if (archivedError) {
    throw archivedError;
  }

  if (paymentError) {
    throw paymentError;
  }

  const invoiceCustomerIds = [...new Set((archivedInvoices ?? []).map((invoice) => invoice.customer_id).filter(Boolean))];
  const invoiceCustomerMap = new Map<string, Awaited<ReturnType<typeof getCustomerSummaryByUserId>>>();
  await Promise.all(invoiceCustomerIds.map(async (customerId) => {
    invoiceCustomerMap.set(customerId, await getCustomerSummaryByUserId(customerId, { admin: true }));
  }));

  const recentInvoices = (archivedInvoices ?? []).slice(0, 12).map((invoice) => ({
    ...toArchivedInvoice(invoice as Record<string, any>),
    customer: invoiceCustomerMap.get(invoice.customer_id)?.displayName ?? "Customer",
    customerId: invoice.customer_id ?? undefined,
  }));

  const spendByCustomer = new Map<string, { customer: string; customerId?: string; totalSpent: number; invoiceCount: number }>();
  for (const invoice of archivedInvoices ?? []) {
    const customerId = invoice.customer_id ?? "";
    const name = invoiceCustomerMap.get(customerId)?.displayName ?? "Customer";
    const existing = spendByCustomer.get(customerId) ?? { customer: name, customerId: customerId || undefined, totalSpent: 0, invoiceCount: 0 };
    existing.totalSpent += Number(invoice.total ?? 0);
    existing.invoiceCount += 1;
    spendByCustomer.set(customerId, existing);
  }

  const overdueEntries = customerBalances.filter((entry) => entry.overdue);

  return {
    totalRunningBalance: customerBalances.reduce((sum, entry) => sum + entry.amount, 0),
    unpaidTotal: customerBalances.reduce((sum, entry) => sum + entry.amount, 0),
    unpaidInvoiceTotal: customerBalances.reduce((sum, entry) => sum + entry.invoiceAmount, 0),
    unpaidShippingTotal: customerBalances.reduce((sum, entry) => sum + entry.shippingAmount, 0),
    paymentsThisCycle: (cycles ?? []).reduce((sum, cycle) => sum + Number(cycle.payments_applied ?? 0), 0),
    overdueCustomerCount: overdueEntries.length,
    overdueTotal: overdueEntries.reduce((sum, entry) => sum + entry.amount, 0),
    archivedInvoiceRevenue: (archivedInvoices ?? []).reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0),
    lifetimeCollected: (archivedInvoices ?? []).reduce((sum, invoice) => sum + Number(invoice.payment_total ?? 0) + Number(invoice.credit_applied ?? 0), 0),
    customerBalances,
    topCustomers: [...spendByCustomer.values()].sort((left, right) => right.totalSpent - left.totalSpent).slice(0, 8),
    recentPayments: (payments ?? []).map((payment) => toPaymentHistoryRecord(payment as Record<string, any>)),
    recentInvoices,
  } satisfies FinancialSummary;
}
