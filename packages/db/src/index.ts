export * from "./supabase";
export * from "./queries";

import type {
  AdminNotification,
  ArchivedInvoice,
  BalanceCycleSummary,
  ClaimedItem,
  CustomerSummary,
  FinancialSummary,
  Product,
  ShipmentRecord,
  ShowEvent,
} from "@fatguydiscounts/types";

export const demoProducts: Product[] = [
  {
    id: "prod-001",
    title: "Vintage denim jacket",
    description: "Live-sale featured outerwear item.",
    price: 28,
    category: "Outerwear",
    quantity: 2,
    status: "active",
  },
  {
    id: "prod-002",
    title: "Bundle lot tee",
    description: "Single-quantity live claim item.",
    price: 12,
    category: "Tees",
    quantity: 1,
    status: "low_stock",
  },
  {
    id: "prod-003",
    title: "Retro flannel",
    description: "Held visible after sellout for restock requests.",
    price: 18,
    category: "Flannels",
    quantity: 0,
    status: "out_of_stock",
  },
];

export const platformSummary = [
  "Shared role, status, and product contracts",
  "Claim-first order lifecycle with running balances",
  "Customer and admin views built from the same domain package",
  "Supabase-backed web launch with future mobile reuse",
];

export const demoCustomer: CustomerSummary = {
  id: "cust-001",
  displayName: "Jordan Rivers",
  email: "jordan@example.com",
  role: "customer",
  accountState: "approved",
  timezone: "America/New_York",
  address: "1549 Monroe Ave, Rochester, NY 14618",
  creditBalance: 9,
  shipmentStatus: "requested",
  lastShipmentDate: "2026-03-12",
};

export const demoCustomers: CustomerSummary[] = [
  demoCustomer,
  {
    id: "cust-002",
    displayName: "Casey Morgan",
    email: "casey@example.com",
    role: "customer",
    accountState: "pending_approval",
    timezone: "America/Chicago",
    address: "422 Mason St, Austin, TX 78701",
    creditBalance: 0,
    shipmentStatus: "none",
    lastShipmentDate: null,
  },
  {
    id: "cust-003",
    displayName: "Taylor West",
    email: "taylor@example.com",
    role: "customer",
    accountState: "claiming_disabled",
    timezone: "America/Los_Angeles",
    address: "87 Oak Ave, Pasadena, CA 91101",
    creditBalance: 14,
    shipmentStatus: "completed",
    lastShipmentDate: "2026-03-20",
  },
];

export const demoBalanceCycle: BalanceCycleSummary = {
  id: "cycle-2026-03",
  status: "active",
  dueDate: "2026-04-04",
  subtotal: 58,
  shipping: 0,
  adjustments: 4,
  paymentsApplied: 15,
  creditsApplied: 9,
};

export const demoClaimedItems: ClaimedItem[] = [
  {
    id: "claim-001",
    productTitle: "Vintage denim jacket",
    quantity: 1,
    unitPrice: 28,
    status: "claimed",
  },
  {
    id: "claim-002",
    productTitle: "Bundle lot tee",
    quantity: 1,
    unitPrice: 12,
    status: "claimed",
  },
  {
    id: "claim-003",
    productTitle: "Manual live sale add-on",
    quantity: 1,
    unitPrice: 18,
    status: "adjusted",
  },
];

export const demoArchivedInvoices: ArchivedInvoice[] = [
  {
    id: "inv-2026-02",
    cycleLabel: "February 2026 cycle",
    paidAt: "2026-03-02",
    total: 84,
    paymentTotal: 84,
    creditApplied: 0,
  },
  {
    id: "inv-2026-01",
    cycleLabel: "January 2026 cycle",
    paidAt: "2026-02-01",
    total: 132,
    paymentTotal: 118,
    creditApplied: 14,
  },
];

export const demoShipmentRecords: ShipmentRecord[] = [
  {
    id: "ship-001",
    customerName: "Jordan Rivers",
    status: "requested",
    requestedAt: "2026-03-29T09:05:00-04:00",
    trackingNumber: null,
    shipmentDate: null,
  },
  {
    id: "ship-002",
    customerName: "Taylor West",
    status: "completed",
    requestedAt: "2026-03-18T12:00:00-04:00",
    trackingNumber: "9405511202555777000000",
    shipmentDate: "2026-03-20",
  },
];

export const demoNotifications: AdminNotification[] = [
  {
    id: "notif-001",
    type: "pending_approval",
    label: "3 customer accounts are waiting for approval",
    createdAt: "2026-03-29T08:30:00-04:00",
  },
  {
    id: "notif-002",
    type: "shipment_request",
    label: "Jordan Rivers requested shipment confirmation",
    createdAt: "2026-03-29T09:05:00-04:00",
  },
  {
    id: "notif-003",
    type: "low_stock",
    label: "Bundle lot tee reached low stock",
    createdAt: "2026-03-29T09:22:00-04:00",
  },
];

export const demoEvents: ShowEvent[] = [
  {
    id: "event-001",
    title: "Sunday claim show",
    startsAt: "2026-03-29T19:30:00-04:00",
    description: "Main weekly sale with outerwear, denim, and bundle claims.",
    externalLink: "https://example.com/live/sunday-claim-show",
    platform: "Facebook Live",
  },
  {
    id: "event-002",
    title: "Midweek clearance drop",
    startsAt: "2026-04-01T20:00:00-04:00",
    description: "Quick-hit clearance stream focused on low inventory closeouts.",
    externalLink: "https://example.com/live/midweek-clearance-drop",
    platform: "Instagram Live",
  },
];

export const demoFinancialSummary: FinancialSummary = {
  totalRunningBalance: 2480,
  unpaidTotal: 2165,
  paymentsThisCycle: 930,
  customerBalances: [
    { customer: "Jordan Rivers", amount: 38, overdue: false },
    { customer: "Casey Morgan", amount: 118, overdue: true },
    { customer: "Taylor West", amount: 76, overdue: false },
  ],
};

export const demoPaymentPreview = {
  paymentAmount: 38,
  creditAmount: 0,
};

