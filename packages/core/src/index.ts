export * from "./auth/guards";
export * from "./workflows/approvals";
export * from "./workflows/claiming";
export * from "./workflows/payments";
export * from "./workflows/shipments";

import type {
  AccountState,
  BalanceCycleSummary,
  CustomerSummary,
  DashboardSection,
  ProductStatus,
  UserRole,
} from "@fatguydiscounts/types";

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  active: "Active",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  hidden: "Hidden",
  archived: "Archived",
};

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  {
    slug: "approvals",
    title: "Approvals and access",
    description: "Manual claim approval, claim-disable controls, bans, and role promotion gates.",
  },
  {
    slug: "inventory",
    title: "Inventory and claims",
    description: "Shared claim logic, stock status rules, and oversell prevention patterns.",
  },
  {
    slug: "balances",
    title: "Running balances",
    description: "Current cycle totals, credits, partial payments, due dates, and archive rollover.",
  },
  {
    slug: "shipments",
    title: "Shipment workflow",
    description: "Address confirmation, request queues, tracking capture, and last shipment visibility.",
  },
  {
    slug: "events",
    title: "Upcoming shows",
    description: "ET-first calendar rendering with customer timezone adaptation after login.",
  },
  {
    slug: "reporting",
    title: "Master admin reporting",
    description: "Financial summary views gated to master admins only.",
  },
];

export const PAYMENT_SCHEDULE_ANCHOR = "2026-04-05";
export const PAYMENT_SCHEDULE_INTERVAL_DAYS = 14;

function parseDateOnly(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getScheduledDueDateForDate(referenceDate: string) {
  const anchor = parseDateOnly(PAYMENT_SCHEDULE_ANCHOR);
  const reference = parseDateOnly(referenceDate);

  if (reference.getTime() <= anchor.getTime()) {
    return PAYMENT_SCHEDULE_ANCHOR;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const dayDiff = Math.floor((reference.getTime() - anchor.getTime()) / msPerDay);
  const intervalCount = Math.ceil(dayDiff / PAYMENT_SCHEDULE_INTERVAL_DAYS);
  const nextDate = new Date(anchor.getTime() + intervalCount * PAYMENT_SCHEDULE_INTERVAL_DAYS * msPerDay);
  return formatDateOnly(nextDate);
}

export function getNextScheduledDueDate(todayIso: string) {
  const today = parseDateOnly(todayIso);
  const nextDay = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  return getScheduledDueDateForDate(formatDateOnly(nextDay));
}

export function calculateBalanceDue(cycle: BalanceCycleSummary) {
  return cycle.subtotal + cycle.shipping + cycle.adjustments - cycle.paymentsApplied - cycle.creditsApplied;
}

export function isSaleActive(salePercentage: number | null | undefined, saleEndsAt: string | null | undefined, nowIso = new Date().toISOString()) {
  if (!salePercentage || salePercentage <= 0) {
    return false;
  }

  if (!saleEndsAt) {
    return false;
  }

  return saleEndsAt > nowIso;
}

export function getSalePrice(originalPrice: number, salePercentage: number | null | undefined, saleEndsAt: string | null | undefined, nowIso = new Date().toISOString()) {
  if (!isSaleActive(salePercentage, saleEndsAt, nowIso)) {
    return null;
  }

  const discount = Math.min(Math.max(Number(salePercentage ?? 0), 0), 100);
  const discounted = originalPrice * (1 - discount / 100);
  return Math.round(discounted * 100) / 100;
}

export function formatSalePercentage(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }

  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function canDeleteArchivedProduct(archivedAt: string | null | undefined, nowIso = new Date().toISOString()) {
  void nowIso;
  return Boolean(archivedAt);
}

export function isBalanceOverdue(cycle: BalanceCycleSummary, todayIso: string) {
  return calculateBalanceDue(cycle) > 0 && cycle.dueDate < todayIso;
}

export function canClaim(role: UserRole, accountState: AccountState) {
  return role === "customer" && accountState === "approved";
}

export function canManageOperations(role: UserRole) {
  return role === "admin" || role === "master_admin";
}

export function canAccessFinancialReporting(role: UserRole) {
  return role === "master_admin";
}

export function accountStateLabel(state: AccountState) {
  return state.replaceAll("_", " ");
}

export function shipmentStatusLabel(state: string) {
  return state.replaceAll("_", " ");
}

export function customerGreeting(customer: CustomerSummary) {
  const base = customer.displayName.split(" ")[0] || customer.displayName;
  return customer.accountState === "approved" ? `Welcome back, ${base}.` : `Hi ${base}, your account is still waiting for approval.`;
}

