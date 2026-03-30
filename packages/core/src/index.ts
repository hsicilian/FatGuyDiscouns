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

export function calculateBalanceDue(cycle: BalanceCycleSummary) {
  return cycle.subtotal + cycle.shipping + cycle.adjustments - cycle.paymentsApplied - cycle.creditsApplied;
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

