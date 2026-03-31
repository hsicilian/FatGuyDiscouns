export * from "./actions";

export type UserRole = "customer" | "admin" | "master_admin";

export type AccountState =
  | "pending_approval"
  | "approved"
  | "claiming_disabled"
  | "banned";

export type ProductStatus =
  | "draft"
  | "active"
  | "low_stock"
  | "out_of_stock"
  | "hidden"
  | "archived";

export type ShipmentStatus = "none" | "requested" | "in_progress" | "completed";

export type NotificationType =
  | "new_claim"
  | "shipment_request"
  | "pending_approval"
  | "low_stock"
  | "restock_request";

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  quantity: number;
  status: ProductStatus;
}

export interface DashboardSection {
  slug: string;
  title: string;
  description: string;
}

export interface ClaimedItem {
  id: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  status: "claimed" | "adjusted";
}

export interface BalanceCycleSummary {
  id: string;
  status: "active" | "archived" | "overdue";
  dueDate: string;
  subtotal: number;
  shipping: number;
  adjustments: number;
  paymentsApplied: number;
  creditsApplied: number;
  customerId?: string;
  customerName?: string;
}

export interface ArchivedInvoice {
  id: string;
  cycleLabel: string;
  paidAt: string;
  total: number;
  paymentTotal: number;
  creditApplied: number;
}

export interface ShipmentRecord {
  id: string;
  customerName: string;
  status: ShipmentStatus;
  requestedAt: string;
  trackingNumber: string | null;
  shipmentDate: string | null;
}

export interface CustomerSummary {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  accountState: AccountState;
  timezone: string;
  address: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  creditBalance: number;
  shipmentStatus: ShipmentStatus;
  lastShipmentDate: string | null;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  note: string;
  createdAt: string;
}

export interface RestockRequestRecord {
  id: string;
  customerId: string | null;
  productTitle: string;
  status: string;
  createdAt: string;
  email: string | null;
}

export interface AdminNotification {
  id: string;
  type: NotificationType;
  label: string;
  createdAt: string;
}

export interface ShowEvent {
  id: string;
  title: string;
  startsAt: string;
  description: string;
  externalLink: string;
  platform?: string;
}

export interface FinancialSummary {
  totalRunningBalance: number;
  unpaidTotal: number;
  paymentsThisCycle: number;
  customerBalances: Array<{
    customer: string;
    amount: number;
    overdue: boolean;
  }>;
}
