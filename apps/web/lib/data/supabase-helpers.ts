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

function getMonthKey(value: string) {
  return value.slice(0, 7);
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

function getInvoiceMerchandiseTotal(invoice: Record<string, any>) {
  const total = Number(invoice.total ?? 0);
  const shippingTotal = Number(invoice.shipping_total ?? invoice.shippingTotal ?? 0);
  return Math.max(0, total - shippingTotal);
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate.slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00.000Z`);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
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
    cost: row.cost == null ? null : Number(row.cost),
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
    shippingTotal: Number(row.shipping_total ?? 0),
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

  const [
    { data: archivedInvoices, error: archivedError },
    { data: payments, error: paymentError },
    { data: shipments, error: shipmentError },
    { data: restockRequests, error: restockError },
    { data: itemRequests, error: itemRequestError },
    { data: products, error: productError },
  ] = await Promise.all([
    admin
      .from("archived_invoices")
      .select("id, customer_id, cycle_label, paid_at, total, shipping_total, payment_total, credit_applied")
      .order("paid_at", { ascending: false }),
    admin
      .from("payments")
        .select("id, amount, created_at, notes, balance_cycles!inner(customer_id)")
        .order("created_at", { ascending: false })
        .limit(25),
    admin
      .from("shipments")
      .select("id, customer_id, status, shipment_date, requested_at")
      .order("requested_at", { ascending: false }),
    admin
      .from("restock_requests")
      .select("id, customer_id, status, created_at, products(title)")
      .order("created_at", { ascending: false }),
    admin
      .from("customer_item_requests")
      .select("id, customer_id, body, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("products")
      .select("id, title, price, cost, inventory_quantity, status, created_at, categories(name)")
      .neq("status", "archived")
      .order("created_at", { ascending: true }),
  ]);

  if (archivedError) {
    throw archivedError;
  }

  if (paymentError) {
    throw paymentError;
  }
  if (shipmentError) {
    throw shipmentError;
  }
  if (restockError) {
    throw restockError;
  }
  if (itemRequestError) {
    throw itemRequestError;
  }
  if (productError) {
    throw productError;
  }

  const invoiceCustomerIds = [...new Set((archivedInvoices ?? []).map((invoice) => invoice.customer_id).filter(Boolean))];
  const paymentCustomerIds = [...new Set((payments ?? []).map((payment) => (payment as any).balance_cycles?.customer_id).filter(Boolean))];
  const shipmentCustomerIds = [...new Set((shipments ?? []).map((shipment) => shipment.customer_id).filter(Boolean))];
  const itemRequestCustomerIds = [...new Set((itemRequests ?? []).map((request) => request.customer_id).filter(Boolean))];
  const invoiceCustomerMap = new Map<string, Awaited<ReturnType<typeof getCustomerSummaryByUserId>>>();
  await Promise.all([...new Set([...invoiceCustomerIds, ...paymentCustomerIds, ...shipmentCustomerIds, ...itemRequestCustomerIds])].map(async (customerId) => {
    invoiceCustomerMap.set(customerId, await getCustomerSummaryByUserId(customerId, { admin: true }));
  }));

  const recentInvoices = (archivedInvoices ?? []).slice(0, 12).map((invoice) => ({
    ...toArchivedInvoice(invoice as Record<string, any>),
    customer: invoiceCustomerMap.get(invoice.customer_id)?.displayName ?? "Customer",
    customerId: invoice.customer_id ?? undefined,
  }));

  const spendByCustomer = new Map<string, { customer: string; customerId?: string; totalSpent: number; invoiceCount: number }>();
  const monthlyInvoiceTotals = new Map<string, { monthKey: string; monthLabel: string; total: number; invoiceCount: number }>();
  const monthlyCustomerSpend = new Map<string, { monthKey: string; monthLabel: string; customer: string; customerId?: string; totalSpent: number; invoiceCount: number }>();
  for (const invoice of archivedInvoices ?? []) {
    const customerId = invoice.customer_id ?? "";
    const name = invoiceCustomerMap.get(customerId)?.displayName ?? "Customer";
    const merchandiseTotal = getInvoiceMerchandiseTotal(invoice as Record<string, any>);
    const existing = spendByCustomer.get(customerId) ?? { customer: name, customerId: customerId || undefined, totalSpent: 0, invoiceCount: 0 };
    existing.totalSpent += merchandiseTotal;
    existing.invoiceCount += 1;
    spendByCustomer.set(customerId, existing);

    const monthKey = getMonthKey(String(invoice.paid_at ?? ""));
    if (monthKey) {
      const monthlyInvoice = monthlyInvoiceTotals.get(monthKey) ?? {
        monthKey,
        monthLabel: formatMonthLabel(monthKey),
        total: 0,
        invoiceCount: 0,
      };
      monthlyInvoice.total += Number(invoice.total ?? 0);
      monthlyInvoice.invoiceCount += 1;
      monthlyInvoiceTotals.set(monthKey, monthlyInvoice);

      const customerMonthKey = `${monthKey}:${customerId || name}`;
      const monthlySpend = monthlyCustomerSpend.get(customerMonthKey) ?? {
        monthKey,
        monthLabel: formatMonthLabel(monthKey),
        customer: name,
        customerId: customerId || undefined,
        totalSpent: 0,
        invoiceCount: 0,
      };
      monthlySpend.totalSpent += merchandiseTotal;
      monthlySpend.invoiceCount += 1;
      monthlyCustomerSpend.set(customerMonthKey, monthlySpend);
    }
  }

  const monthlyPaymentTotals = new Map<string, { monthKey: string; monthLabel: string; total: number; paymentCount: number }>();
  const paymentsByCustomer = new Map<string, { total: number; paymentCount: number; lastPaymentAt?: string }>();
  for (const payment of payments ?? []) {
    const monthKey = getMonthKey(String(payment.created_at ?? ""));
    const customerId = (payment as any).balance_cycles?.customer_id ?? "";
    if (!monthKey) {
      if (customerId) {
        const existing = paymentsByCustomer.get(customerId) ?? { total: 0, paymentCount: 0, lastPaymentAt: undefined };
        existing.total += Number(payment.amount ?? 0);
        existing.paymentCount += 1;
        existing.lastPaymentAt = existing.lastPaymentAt && existing.lastPaymentAt > String(payment.created_at ?? "") ? existing.lastPaymentAt : String(payment.created_at ?? "");
        paymentsByCustomer.set(customerId, existing);
      }
      continue;
    }

    const monthlyPayment = monthlyPaymentTotals.get(monthKey) ?? {
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
      total: 0,
      paymentCount: 0,
    };
    monthlyPayment.total += Number(payment.amount ?? 0);
    monthlyPayment.paymentCount += 1;
    monthlyPaymentTotals.set(monthKey, monthlyPayment);

    if (customerId) {
      const existing = paymentsByCustomer.get(customerId) ?? { total: 0, paymentCount: 0, lastPaymentAt: undefined };
      existing.total += Number(payment.amount ?? 0);
      existing.paymentCount += 1;
      existing.lastPaymentAt = existing.lastPaymentAt && existing.lastPaymentAt > String(payment.created_at ?? "") ? existing.lastPaymentAt : String(payment.created_at ?? "");
      paymentsByCustomer.set(customerId, existing);
    }
  }

  const shipmentCountsByCustomer = new Map<string, number>();
  const monthlyShipmentVolume = new Map<string, { monthKey: string; monthLabel: string; shipmentCount: number }>();
  for (const shipment of shipments ?? []) {
    if (shipment.status !== "completed") {
      continue;
    }

    if (shipment.customer_id) {
      shipmentCountsByCustomer.set(shipment.customer_id, (shipmentCountsByCustomer.get(shipment.customer_id) ?? 0) + 1);
    }

    const rawDate = String(shipment.shipment_date ?? shipment.requested_at ?? "");
    const monthKey = getMonthKey(rawDate);
    if (!monthKey) {
      continue;
    }
    const existing = monthlyShipmentVolume.get(monthKey) ?? {
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
      shipmentCount: 0,
    };
    existing.shipmentCount += 1;
    monthlyShipmentVolume.set(monthKey, existing);
  }

  const restockDemand = new Map<string, { productTitle: string; requestCount: number; openCount: number; customerIds: Set<string> }>();
  for (const request of restockRequests ?? []) {
    const productRelation = (request as any).products;
    const productTitle = Array.isArray(productRelation) ? productRelation[0]?.title ?? "Product" : productRelation?.title ?? "Product";
    const existing = restockDemand.get(productTitle) ?? {
      productTitle,
      requestCount: 0,
      openCount: 0,
      customerIds: new Set<string>(),
    };
    existing.requestCount += 1;
    if (request.status === "open") {
      existing.openCount += 1;
    }
    if (request.customer_id) {
      existing.customerIds.add(request.customer_id);
    }
    restockDemand.set(productTitle, existing);
  }

  const itemRequestDemand = new Map<string, { request: string; requestCount: number; customerIds: Set<string>; latestRequestAt?: string }>();
  for (const request of itemRequests ?? []) {
    const body = String(request.body ?? "").trim();
    if (!body) {
      continue;
    }
    const existing = itemRequestDemand.get(body) ?? {
      request: body,
      requestCount: 0,
      customerIds: new Set<string>(),
      latestRequestAt: undefined,
    };
    existing.requestCount += 1;
    if (request.customer_id) {
      existing.customerIds.add(request.customer_id);
    }
    const createdAt = String(request.created_at ?? "");
    existing.latestRequestAt = existing.latestRequestAt && existing.latestRequestAt > createdAt ? existing.latestRequestAt : createdAt;
    itemRequestDemand.set(body, existing);
  }

  const overdueEntries = customerBalances.filter((entry) => entry.overdue);

  const customerLifetimeSummary = [...spendByCustomer.values()]
    .map((entry) => {
      const paymentSummary = entry.customerId ? paymentsByCustomer.get(entry.customerId) : undefined;
      const shipmentCount = entry.customerId ? shipmentCountsByCustomer.get(entry.customerId) ?? 0 : 0;
      return {
        customer: entry.customer,
        customerId: entry.customerId,
        lifetimeSpent: entry.totalSpent,
        lifetimePaid: paymentSummary?.total ?? 0,
        invoiceCount: entry.invoiceCount,
        paymentCount: paymentSummary?.paymentCount ?? 0,
        shipmentCount,
        lastPaymentAt: paymentSummary?.lastPaymentAt,
      };
    })
    .sort((left, right) => right.lifetimeSpent - left.lifetimeSpent)
    .slice(0, 20);

  const latePaymentWatchlist = overdueEntries
    .map((entry) => {
      const paymentSummary = entry.customerId ? paymentsByCustomer.get(entry.customerId) : undefined;
      return {
        customer: entry.customer,
        customerId: entry.customerId,
        overdueAmount: entry.amount,
        invoiceAmount: entry.invoiceAmount,
        shippingAmount: entry.shippingAmount,
        lastPaymentAt: paymentSummary?.lastPaymentAt,
      };
    })
    .sort((left, right) => right.overdueAmount - left.overdueAmount);

  const activeInventoryRows = (products ?? []).filter((row) => row.status !== "draft" && row.status !== "hidden");
  const inventoryMarginByCategory = new Map<string, {
    category: string;
    itemCount: number;
    units: number;
    retailValue: number;
    costValue: number;
    estimatedGrossProfit: number;
  }>();
  const inventoryAgingBuckets = new Map<string, {
    label: string;
    itemCount: number;
    units: number;
    retailValue: number;
    costValue: number;
  }>();
  const stalestInventory = activeInventoryRows
    .map((row) => {
      const categoryRelation = (row as Record<string, any>).categories as { name?: string } | Array<{ name?: string }> | null | undefined;
      const quantity = Number(row.inventory_quantity ?? 0);
      const price = Number(row.price ?? 0);
      const cost = Number(row.cost ?? 0);
      const category =
        Array.isArray(categoryRelation)
          ? (categoryRelation[0]?.name ?? "Uncategorized")
          : (categoryRelation?.name ?? "Uncategorized");
      const createdDate = String(row.created_at ?? siteToday()).slice(0, 10);
      const daysListed = daysBetween(createdDate, siteToday());
      const retailValue = price * quantity;
      const costValue = cost * quantity;

      const categoryEntry = inventoryMarginByCategory.get(category) ?? {
        category,
        itemCount: 0,
        units: 0,
        retailValue: 0,
        costValue: 0,
        estimatedGrossProfit: 0,
      };
      categoryEntry.itemCount += 1;
      categoryEntry.units += quantity;
      categoryEntry.retailValue += retailValue;
      categoryEntry.costValue += costValue;
      categoryEntry.estimatedGrossProfit += retailValue - costValue;
      inventoryMarginByCategory.set(category, categoryEntry);

      const bucketLabel =
        daysListed <= 30 ? "0-30 days"
          : daysListed <= 60 ? "31-60 days"
            : daysListed <= 90 ? "61-90 days"
              : "91+ days";
      const bucketEntry = inventoryAgingBuckets.get(bucketLabel) ?? {
        label: bucketLabel,
        itemCount: 0,
        units: 0,
        retailValue: 0,
        costValue: 0,
      };
      bucketEntry.itemCount += 1;
      bucketEntry.units += quantity;
      bucketEntry.retailValue += retailValue;
      bucketEntry.costValue += costValue;
      inventoryAgingBuckets.set(bucketLabel, bucketEntry);

      return {
        productId: String(row.id),
        title: String(row.title ?? "Product"),
        category,
        quantity,
        daysListed,
        retailValue,
        costValue,
      };
    })
    .sort((left, right) => {
      if (right.daysListed !== left.daysListed) {
        return right.daysListed - left.daysListed;
      }
      return right.costValue - left.costValue;
    })
    .slice(0, 12);

  const inventoryRetailValue = activeInventoryRows.reduce(
    (sum, row) => sum + Number(row.price ?? 0) * Number(row.inventory_quantity ?? 0),
    0,
  );
  const inventoryCostBasis = activeInventoryRows.reduce(
    (sum, row) => sum + Number(row.cost ?? 0) * Number(row.inventory_quantity ?? 0),
    0,
  );

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
    monthlyInvoiceTotals: [...monthlyInvoiceTotals.values()].sort((left, right) => right.monthKey.localeCompare(left.monthKey)).slice(0, 12),
    monthlyPaymentTotals: [...monthlyPaymentTotals.values()].sort((left, right) => right.monthKey.localeCompare(left.monthKey)).slice(0, 12),
    monthlyCustomerSpend: [...monthlyCustomerSpend.values()]
      .sort((left, right) => {
        const monthCompare = right.monthKey.localeCompare(left.monthKey);
        return monthCompare !== 0 ? monthCompare : right.totalSpent - left.totalSpent;
      })
      .slice(0, 24),
    latePaymentWatchlist,
    customerLifetimeSummary,
    monthlyShipmentVolume: [...monthlyShipmentVolume.values()].sort((left, right) => right.monthKey.localeCompare(left.monthKey)).slice(0, 12),
    restockDemand: [...restockDemand.values()]
      .map((entry) => ({
        productTitle: entry.productTitle,
        requestCount: entry.requestCount,
        openCount: entry.openCount,
        customerCount: entry.customerIds.size,
      }))
      .sort((left, right) => right.requestCount - left.requestCount)
      .slice(0, 12),
    itemRequestDemand: [...itemRequestDemand.values()]
      .map((entry) => ({
        request: entry.request,
        requestCount: entry.requestCount,
        customerCount: entry.customerIds.size,
        latestRequestAt: entry.latestRequestAt,
      }))
      .sort((left, right) => {
        if (right.requestCount !== left.requestCount) {
          return right.requestCount - left.requestCount;
        }
        return String(right.latestRequestAt ?? "").localeCompare(String(left.latestRequestAt ?? ""));
      })
      .slice(0, 12),
    inventoryRetailValue,
    inventoryCostBasis,
    inventoryEstimatedGrossProfit: inventoryRetailValue - inventoryCostBasis,
    inventoryMarginByCategory: [...inventoryMarginByCategory.values()].sort((left, right) => right.estimatedGrossProfit - left.estimatedGrossProfit),
    inventoryAgingBuckets: [
      "0-30 days",
      "31-60 days",
      "61-90 days",
      "91+ days",
    ]
      .map((label) => inventoryAgingBuckets.get(label) ?? {
        label,
        itemCount: 0,
        units: 0,
        retailValue: 0,
        costValue: 0,
      }),
    stalestInventory,
  } satisfies FinancialSummary;
}
