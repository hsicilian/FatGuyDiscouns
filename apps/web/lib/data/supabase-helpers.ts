import "server-only";

import { calculateBalanceDue, getSalePrice, getScheduledDueDateForDate, isBalanceOverdue, isSaleActive } from "@fatguydiscounts/core";
import type {
  ArchivedInvoice,
  BalanceCycleSummary,
  ClaimedItem,
  CustomerSummary,
  Product,
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

export async function getSupabaseCycleRow(customerId?: string) {
  const actor = await getCurrentActor();

  if (customerId) {
    const admin = await getAdminClient();
    const { data } = await admin.from("balance_cycles").select("*").eq("customer_id", customerId).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    return data;
  }

  if (actor.role === "customer") {
    const admin = await getAdminClient();
    const { data } = await admin.from("balance_cycles").select("*").eq("customer_id", actor.id).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    return data;
  }

  const admin = await getAdminClient();
  const { data } = await admin.from("balance_cycles").select("*").eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

export async function ensureActiveCycle(customerId: string) {
  const admin = await getAdminClient();
  const existing = await getSupabaseCycleRow(customerId);
  if (existing) {
    return existing;
  }

  const { data, error } = await admin.from("balance_cycles").insert({ customer_id: customerId, status: "active", due_date: nextDueDateFromToday(), shipping_total: 0, adjustments_total: 0, payments_applied: 0, credits_applied: 0 }).select("*").single();
  if (error) {
    throw error;
  }
  return data;
}

export async function getTargetCycleContext() {
  const actor = await getCurrentActor();
  const cycle = await getSupabaseCycleRow();
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

  const customerBalances = await Promise.all((cycles ?? []).map(async (cycle) => {
    const subtotal = await getCycleSubtotal(cycle.id, { admin: true });
    const summary = mapBalanceCycle(cycle as Record<string, any>, subtotal);
    const customer = await getCustomerSummaryByUserId(cycle.customer_id, { admin: true });
    return {
      customer: customer.displayName,
      amount: calculateBalanceDue(summary),
      overdue: isBalanceOverdue(summary, siteToday()),
    };
  }));

  return {
    totalRunningBalance: customerBalances.reduce((sum, entry) => sum + entry.amount, 0),
    unpaidTotal: customerBalances.reduce((sum, entry) => sum + entry.amount, 0),
    paymentsThisCycle: (cycles ?? []).reduce((sum, cycle) => sum + Number(cycle.payments_applied ?? 0), 0),
    customerBalances,
  };
}
