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
    cost: 8,
    originalPrice: 28,
    salePrice: null,
    salePercentage: null,
    saleEndsAt: null,
    isOnSale: false,
    archivedAt: null,
    category: "Outerwear",
    quantity: 2,
    status: "active",
    homepageFeatured: false,
    images: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "prod-002",
    title: "Bundle lot tee",
    description: "Single-quantity live claim item.",
    price: 12,
    cost: 3,
    originalPrice: 12,
    salePrice: null,
    salePercentage: null,
    saleEndsAt: null,
    isOnSale: false,
    archivedAt: null,
    category: "Tees",
    quantity: 1,
    status: "low_stock",
    homepageFeatured: false,
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "prod-003",
    title: "Retro flannel",
    description: "Held visible after sellout for restock requests.",
    price: 18,
    cost: 6,
    originalPrice: 18,
    salePrice: null,
    salePercentage: null,
    saleEndsAt: null,
    isOnSale: false,
    archivedAt: null,
    category: "Flannels",
    quantity: 0,
    status: "out_of_stock",
    homepageFeatured: false,
    images: [
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
    ],
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
  fulfillmentMethod: "shipping",
  address: "1549 Monroe Ave, Rochester, NY 14618",
  phone: "",
  street: "1549 Monroe Ave",
  city: "Rochester",
  region: "NY",
  postalCode: "14618",
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
    fulfillmentMethod: "shipping",
    address: "422 Mason St, Austin, TX 78701",
    phone: "",
    street: "422 Mason St",
    city: "Austin",
    region: "TX",
    postalCode: "78701",
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
    fulfillmentMethod: "shipping",
    address: "87 Oak Ave, Pasadena, CA 91101",
    phone: "",
    street: "87 Oak Ave",
    city: "Pasadena",
    region: "CA",
    postalCode: "91101",
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
    shippingTotal: 8,
    paymentTotal: 84,
    creditApplied: 0,
  },
  {
    id: "inv-2026-01",
    cycleLabel: "January 2026 cycle",
    paidAt: "2026-02-01",
    total: 132,
    shippingTotal: 12,
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
    shippingInvoice: null,
    shipmentDate: null,
  },
  {
    id: "ship-002",
    customerName: "Taylor West",
    status: "completed",
    requestedAt: "2026-03-18T12:00:00-04:00",
    trackingNumber: "9405511202555777000000",
    shippingInvoice: "PS-240318-1",
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
  unpaidInvoiceTotal: 2077,
  unpaidShippingTotal: 88,
  paymentsThisCycle: 930,
  overdueCustomerCount: 1,
  overdueTotal: 118,
  archivedInvoiceRevenue: 216,
  lifetimeCollected: 216,
  customerBalances: [
    { customer: "Jordan Rivers", customerId: "cust-001", amount: 38, invoiceAmount: 30, shippingAmount: 8, overdue: false },
    { customer: "Casey Morgan", customerId: "cust-002", amount: 118, invoiceAmount: 96, shippingAmount: 22, overdue: true },
    { customer: "Taylor West", customerId: "cust-003", amount: 76, invoiceAmount: 64, shippingAmount: 12, overdue: false },
  ],
  topCustomers: [
    { customer: "Jordan Rivers", customerId: "cust-001", totalSpent: 196, invoiceCount: 2 },
    { customer: "Casey Morgan", customerId: "cust-002", totalSpent: 162, invoiceCount: 2 },
    { customer: "Taylor West", customerId: "cust-003", totalSpent: 136, invoiceCount: 1 },
  ],
  recentPayments: [
    { id: "payment-001", customerId: "cust-001", amount: 38, createdAt: "2026-03-29", notes: "Active cycle payment" },
    { id: "payment-002", customerId: "cust-002", amount: 84, createdAt: "2026-03-02", notes: "February 2026 cycle payment" },
    { id: "payment-003", customerId: "cust-003", amount: 118, createdAt: "2026-02-01", notes: "January 2026 cycle payment" },
  ],
  recentInvoices: [
    { ...demoArchivedInvoices[0], customer: "Jordan Rivers", customerId: "cust-001" },
    { ...demoArchivedInvoices[1], customer: "Jordan Rivers", customerId: "cust-001" },
  ],
  monthlyInvoiceTotals: [
    { monthKey: "2026-03", monthLabel: "March 2026", total: 216, invoiceCount: 2 },
    { monthKey: "2026-02", monthLabel: "February 2026", total: 148, invoiceCount: 1 },
  ],
  monthlyPaymentTotals: [
    { monthKey: "2026-03", monthLabel: "March 2026", total: 122, paymentCount: 2 },
    { monthKey: "2026-02", monthLabel: "February 2026", total: 118, paymentCount: 1 },
  ],
  monthlyCustomerSpend: [
    { monthKey: "2026-03", monthLabel: "March 2026", customer: "Jordan Rivers", customerId: "cust-001", totalSpent: 196, invoiceCount: 2 },
    { monthKey: "2026-02", monthLabel: "February 2026", customer: "Taylor West", customerId: "cust-003", totalSpent: 136, invoiceCount: 1 },
  ],
  latePaymentWatchlist: [
    { customer: "Casey Morgan", customerId: "cust-002", overdueAmount: 118, invoiceAmount: 96, shippingAmount: 22, lastPaymentAt: "2026-03-02" },
  ],
  customerLifetimeSummary: [
    { customer: "Jordan Rivers", customerId: "cust-001", lifetimeSpent: 196, lifetimePaid: 216, invoiceCount: 2, paymentCount: 1, shipmentCount: 1, lastPaymentAt: "2026-03-29" },
    { customer: "Casey Morgan", customerId: "cust-002", lifetimeSpent: 162, lifetimePaid: 84, invoiceCount: 2, paymentCount: 1, shipmentCount: 0, lastPaymentAt: "2026-03-02" },
  ],
  monthlyShipmentVolume: [
    { monthKey: "2026-03", monthLabel: "March 2026", shipmentCount: 1 },
  ],
  restockDemand: [
    { productTitle: "Retro flannel", requestCount: 2, openCount: 2, customerCount: 2 },
  ],
  itemRequestDemand: [
    { request: "Looking for plus-size vintage band tees", requestCount: 1, customerCount: 1, latestRequestAt: "2026-03-28T14:00:00.000Z" },
  ],
  inventoryRetailValue: 68,
  inventoryCostBasis: 19,
  inventoryEstimatedGrossProfit: 49,
  inventoryMarginByCategory: [
    { category: "Outerwear", itemCount: 1, units: 2, retailValue: 56, costValue: 16, estimatedGrossProfit: 40 },
    { category: "Tees", itemCount: 1, units: 1, retailValue: 12, costValue: 3, estimatedGrossProfit: 9 },
    { category: "Flannels", itemCount: 1, units: 0, retailValue: 0, costValue: 0, estimatedGrossProfit: 0 },
  ],
  inventoryAgingBuckets: [
    { label: "0-30 days", itemCount: 1, units: 1, retailValue: 12, costValue: 3 },
    { label: "31-60 days", itemCount: 1, units: 0, retailValue: 0, costValue: 0 },
    { label: "61-90 days", itemCount: 1, units: 2, retailValue: 56, costValue: 16 },
    { label: "91+ days", itemCount: 0, units: 0, retailValue: 0, costValue: 0 },
  ],
  stalestInventory: [
    { productId: "prod-001", title: "Vintage denim jacket", category: "Outerwear", quantity: 2, daysListed: 87, retailValue: 56, costValue: 16 },
    { productId: "prod-003", title: "Retro flannel", category: "Flannels", quantity: 0, daysListed: 62, retailValue: 0, costValue: 0 },
    { productId: "prod-002", title: "Bundle lot tee", category: "Tees", quantity: 1, daysListed: 37, retailValue: 12, costValue: 3 },
  ],
};

export const demoPaymentPreview = {
  paymentAmount: 38,
  creditAmount: 0,
};

