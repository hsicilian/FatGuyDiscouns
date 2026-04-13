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
  | "restock_request"
  | "customer_message"
  | "customer_item_request";

export interface ProductImageRecord {
  id: string;
  url: string;
  position: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  cost?: number | null;
  originalPrice: number;
  salePrice: number | null;
  salePercentage: number | null;
  saleEndsAt: string | null;
  isOnSale: boolean;
  archivedAt: string | null;
  category: string;
  quantity: number;
  status: ProductStatus;
  homepageFeatured: boolean;
  images: string[];
  imageRecords?: ProductImageRecord[];
}

export interface CategoryOption {
  id: string;
  name: string;
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
  createdAt?: string;
}

export interface ClaimHistoryRecord extends ClaimedItem {
  createdAt: string;
  cycleStatus?: "active" | "archived" | "overdue";
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
  shippingTotal?: number;
  paymentTotal: number;
  creditApplied: number;
}

export interface PaymentHistoryRecord {
  id: string;
  customerId: string;
  cycleId?: string;
  amount: number;
  appliedAmount?: number;
  overpaymentAmount?: number;
  cycleStatus?: "active" | "archived";
  createdAt: string;
  notes: string;
}

export interface CustomerMessageRecord {
  id: string;
  customerId: string;
  customerName?: string;
  senderRole: "customer" | "admin";
  message: string;
  createdAt: string;
}

export interface CustomerItemRequestRecord {
  id: string;
  customerId: string;
  customerName?: string;
  request: string;
  status: string;
  createdAt: string;
}

export interface ShipmentRecord {
  id: string;
  customerId?: string;
  customerName: string;
  status: ShipmentStatus;
  requestedAt: string;
  trackingNumber: string | null;
  shippingInvoice: string | null;
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
  customerName?: string;
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
  readAt?: string | null;
}

export interface AdminAuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actionType: string;
  entityType: string;
  entityId: string | null;
  targetCustomerId?: string | null;
  summary: string;
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
  unpaidInvoiceTotal: number;
  unpaidShippingTotal: number;
  paymentsThisCycle: number;
  overdueCustomerCount: number;
  overdueTotal: number;
  archivedInvoiceRevenue: number;
  lifetimeCollected: number;
  customerBalances: Array<{
    customer: string;
    amount: number;
    invoiceAmount: number;
    shippingAmount: number;
    overdue: boolean;
    customerId?: string;
  }>;
  topCustomers: Array<{
    customer: string;
    customerId?: string;
    totalSpent: number;
    invoiceCount: number;
  }>;
  recentPayments: PaymentHistoryRecord[];
  recentInvoices: Array<ArchivedInvoice & {
    customer: string;
    customerId?: string;
  }>;
  monthlyInvoiceTotals: Array<{
    monthKey: string;
    monthLabel: string;
    total: number;
    invoiceCount: number;
  }>;
  monthlyPaymentTotals: Array<{
    monthKey: string;
    monthLabel: string;
    total: number;
    paymentCount: number;
  }>;
  monthlyCustomerSpend: Array<{
    monthKey: string;
    monthLabel: string;
    customer: string;
    customerId?: string;
    totalSpent: number;
    invoiceCount: number;
  }>;
  latePaymentWatchlist: Array<{
    customer: string;
    customerId?: string;
    overdueAmount: number;
    invoiceAmount: number;
    shippingAmount: number;
    lastPaymentAt?: string;
  }>;
  customerLifetimeSummary: Array<{
    customer: string;
    customerId?: string;
    lifetimeSpent: number;
    lifetimePaid: number;
    invoiceCount: number;
    paymentCount: number;
    shipmentCount: number;
    lastPaymentAt?: string;
  }>;
  monthlyShipmentVolume: Array<{
    monthKey: string;
    monthLabel: string;
    shipmentCount: number;
  }>;
  restockDemand: Array<{
    productTitle: string;
    requestCount: number;
    openCount: number;
    customerCount: number;
  }>;
  itemRequestDemand: Array<{
    request: string;
    requestCount: number;
    customerCount: number;
    latestRequestAt?: string;
  }>;
  inventoryRetailValue: number;
  inventoryCostBasis: number;
  inventoryEstimatedGrossProfit: number;
  inventoryMarginByCategory: Array<{
    category: string;
    itemCount: number;
    units: number;
    retailValue: number;
    costValue: number;
    estimatedGrossProfit: number;
  }>;
  inventoryAgingBuckets: Array<{
    label: string;
    itemCount: number;
    units: number;
    retailValue: number;
    costValue: number;
  }>;
  stalestInventory: Array<{
    productId: string;
    title: string;
    category: string;
    quantity: number;
    daysListed: number;
    retailValue: number;
    costValue: number;
  }>;
}

export type CrossListedPlatform = string;

export interface CrossListedInventoryRecord {
  id: string;
  sku: string;
  itemName: string;
  cost?: number | null;
  platforms: CrossListedPlatform[];
  platformDates: Record<string, string>;
  updatedAt: string;
}
