import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  applyPaymentToBalance,
  calculateBalanceDue,
  canRequestShipment,
  deriveProductStatus,
  getScheduledDueDateForDate,
  isBalanceOverdue,
  nextShipmentStatus,
  validateClaimAttempt,
} from "@fatguydiscounts/core";
import { getProductPath } from "../products";
import { productMatchesLookup } from "../products";
import { platformSummary } from "@fatguydiscounts/db";
import type {
  AccountState,
  AdminAuditEntry,
  AdminNotification,
  ArchivedInvoice,
  BalanceCycleSummary,
  CategoryOption,
  ClaimedItem,
  ClaimHistoryRecord,
  CrossListedInventoryRecord,
  CustomerItemRequestRecord,
  CustomerMessageRecord,
  CustomerNote,
  CustomerSummary,
  FinancialSummary,
  PaymentHistoryRecord,
  Product,
  RestockRequestRecord,
  ShowEvent,
  ShipmentRecord,
  ShipmentStatus,
} from "@fatguydiscounts/types";

export interface LocalDatabase {
  activeCustomerId: string;
  categories: CategoryOption[];
  products: Product[];
  customers: CustomerSummary[];
  balanceCycle: BalanceCycleSummary;
  claimedItems: ClaimedItem[];
  paymentHistory: PaymentHistoryRecord[];
  archivedInvoices: ArchivedInvoice[];
  shipmentRecords: ShipmentRecord[];
  customerNotes: CustomerNote[];
  customerMessages: CustomerMessageRecord[];
  customerItemRequests: CustomerItemRequestRecord[];
  crossListedInventory: CrossListedInventoryRecord[];
  adminAuditLog: AdminAuditEntry[];
  notifications: AdminNotification[];
  events: ShowEvent[];
  paymentDefaults: {
    paymentAmount: number;
    creditAmount: number;
  };
}

const dbPath = join(process.cwd(), "apps", "web", "data", "local-db.json");

function getPaymentBreakdown(balanceDue: number, paymentAmount: number) {
  const appliedAmount = Math.min(paymentAmount, Math.max(balanceDue, 0));
  const overpaymentAmount = Math.max(paymentAmount - appliedAmount, 0);
  return { appliedAmount, overpaymentAmount };
}

function serialize(db: LocalDatabase) {
  return `${JSON.stringify(db, null, 2)}\n`;
}

function createInitialDatabase(): LocalDatabase {
  return {
    activeCustomerId: "cust-001",
    categories: [
      { id: "cat-001", name: "Outerwear" },
      { id: "cat-002", name: "Tees" },
      { id: "cat-003", name: "Flannels" },
    ],
    products: [
      {
        id: "prod-001",
        title: "Vintage denim jacket",
        description: "Live-sale featured outerwear item.",
        price: 28,
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
        imageRecords: [
          { id: "prod-001-image-0", url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80", position: 0 },
          { id: "prod-001-image-1", url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80", position: 1 },
          { id: "prod-001-image-2", url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=80", position: 2 },
          { id: "prod-001-image-3", url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80", position: 3 },
        ],
      },
      {
        id: "prod-002",
        title: "Bundle lot tee",
        description: "Single-quantity live claim item.",
        price: 12,
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
        imageRecords: [
          { id: "prod-002-image-0", url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80", position: 0 },
          { id: "prod-002-image-1", url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80", position: 1 },
          { id: "prod-002-image-2", url: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1200&q=80", position: 2 },
          { id: "prod-002-image-3", url: "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=1200&q=80", position: 3 },
        ],
      },
      {
        id: "prod-003",
        title: "Retro flannel",
        description: "Held visible after sellout for restock requests.",
        price: 18,
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
        imageRecords: [
          { id: "prod-003-image-0", url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80", position: 0 },
          { id: "prod-003-image-1", url: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80", position: 1 },
          { id: "prod-003-image-2", url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80", position: 2 },
          { id: "prod-003-image-3", url: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80", position: 3 },
        ],
      },
    ],
    customers: [
      {
        id: "cust-001",
        displayName: "Jordan Rivers",
        email: "jordan@example.com",
      role: "customer",
      accountState: "approved",
      timezone: "America/New_York",
      address: "1549 Monroe Ave, Rochester, NY 14618",
      street: "1549 Monroe Ave",
      city: "Rochester",
      region: "NY",
      postalCode: "14618",
      creditBalance: 9,
        shipmentStatus: "requested",
        lastShipmentDate: "2026-03-12",
      },
      {
        id: "cust-002",
        displayName: "Casey Morgan",
        email: "casey@example.com",
      role: "customer",
      accountState: "pending_approval",
      timezone: "America/Chicago",
      address: "422 Mason St, Austin, TX 78701",
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
      address: "87 Oak Ave, Pasadena, CA 91101",
      street: "87 Oak Ave",
      city: "Pasadena",
      region: "CA",
      postalCode: "91101",
      creditBalance: 14,
        shipmentStatus: "completed",
        lastShipmentDate: "2026-03-20",
      },
    ],
    balanceCycle: {
      id: "cycle-2026-03",
      status: "active",
      dueDate: "2026-04-05",
      subtotal: 58,
      shipping: 0,
      adjustments: 4,
      paymentsApplied: 15,
      creditsApplied: 9,
    },
    claimedItems: [
      {
        id: "claim-001",
        productTitle: "Vintage denim jacket",
        quantity: 1,
        unitPrice: 28,
        status: "claimed",
        createdAt: "2026-03-15T10:30:00-04:00",
      },
      {
        id: "claim-002",
        productTitle: "Bundle lot tee",
        quantity: 1,
        unitPrice: 12,
        status: "claimed",
        createdAt: "2026-03-28T14:10:00-04:00",
      },
      {
        id: "claim-003",
        productTitle: "Manual live sale add-on",
        quantity: 1,
        unitPrice: 18,
        status: "adjusted",
        createdAt: "2026-03-29T18:45:00-04:00",
      },
    ],
    paymentHistory: [
      { id: "payment-001", customerId: "cust-001", amount: 38, appliedAmount: 38, overpaymentAmount: 0, cycleStatus: "active", createdAt: "2026-03-29", notes: "Active cycle payment" },
      { id: "payment-002", customerId: "cust-002", amount: 84, appliedAmount: 84, overpaymentAmount: 0, cycleStatus: "archived", createdAt: "2026-03-02", notes: "February 2026 cycle payment" },
      { id: "payment-003", customerId: "cust-003", amount: 118, appliedAmount: 118, overpaymentAmount: 0, cycleStatus: "archived", createdAt: "2026-02-01", notes: "January 2026 cycle payment" },
    ],
    archivedInvoices: [
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
    ],
    shipmentRecords: [
      {
        id: "ship-001",
        customerId: "cust-001",
        customerName: "Jordan Rivers",
        status: "requested",
        requestedAt: "2026-03-29T09:05:00-04:00",
        trackingNumber: null,
        shippingInvoice: null,
        shipmentDate: null,
      },
      {
        id: "ship-002",
        customerId: "cust-003",
        customerName: "Taylor West",
        status: "completed",
        requestedAt: "2026-03-18T12:00:00-04:00",
        trackingNumber: "9405511202555777000000",
        shippingInvoice: "PS-240318-1",
        shipmentDate: "2026-03-20",
      },
    ],
    customerNotes: [
      {
        id: "note-001",
        customerId: "cust-001",
        note: "Prefers bundled shipping after Sunday shows.",
        createdAt: "2026-03-15T10:30:00-04:00",
      },
      {
        id: "note-002",
        customerId: "cust-002",
        note: "Waiting on first-time approval and address confirmation.",
        createdAt: "2026-03-28T14:10:00-04:00",
      },
    ],
    customerMessages: [
      {
        id: "msg-001",
        customerId: "cust-001",
        customerName: "Jordan Rivers",
        senderRole: "customer",
        message: "Can you hold my next shipment until after Sunday's live?",
        createdAt: "2026-03-27T11:20:00-04:00",
      },
      {
        id: "msg-002",
        customerId: "cust-001",
        customerName: "Jordan Rivers",
        senderRole: "admin",
        message: "Yes, I can hold that shipment and will wait for your confirmation after the show.",
        createdAt: "2026-03-27T11:42:00-04:00",
      },
      {
        id: "msg-003",
        customerId: "cust-001",
        customerName: "Jordan Rivers",
        senderRole: "customer",
        message: "I updated my address and wanted to make sure it saved.",
        createdAt: "2026-03-29T18:45:00-04:00",
      },
    ],
    customerItemRequests: [],
    crossListedInventory: [
      {
        id: "cross-001",
        sku: "0004",
        itemName: "Vintage denim jacket",
        cost: 8,
        platforms: ["Poshmark", "Facebook Marketplace", "WN Shop"],
        platformDates: {
          Poshmark: "2026-04-02",
          "Facebook Marketplace": "2026-04-02",
          "WN Shop": "2026-04-02",
        },
        updatedAt: "2026-04-02T09:00:00.000Z",
      },
    ],
    adminAuditLog: [
      {
        id: "audit-001",
        actorId: "admin-demo",
        actorName: "Harold Sicilian",
        actorRole: "master_admin",
        actionType: "inventory.create",
        entityType: "product",
        entityId: "prod-001",
        targetCustomerId: null,
        summary: "Created Vintage denim jacket in inventory.",
        createdAt: "2026-04-01T14:00:00.000Z",
      },
      {
        id: "audit-002",
        actorId: "admin-demo",
        actorName: "Harold Sicilian",
        actorRole: "master_admin",
        actionType: "shipment.update",
        entityType: "shipment",
        entityId: "ship-002",
        targetCustomerId: "cust-003",
        summary: "Completed Taylor West shipment and saved tracking.",
        createdAt: "2026-04-02T16:30:00.000Z",
      },
    ],
    notifications: [
      {
        id: "notif-001",
        type: "pending_approval",
        label: "3 customer accounts are waiting for approval",
        createdAt: "2026-03-29T08:30:00-04:00",
        readAt: null,
      },
      {
        id: "notif-002",
        type: "shipment_request",
        label: "Jordan Rivers requested shipment confirmation",
        createdAt: "2026-03-29T09:05:00-04:00",
        readAt: null,
      },
      {
        id: "notif-003",
        type: "low_stock",
        label: "Bundle lot tee reached low stock",
        createdAt: "2026-03-29T09:22:00-04:00",
        readAt: null,
      },
    ],
    events: [
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
    ],
    paymentDefaults: {
      paymentAmount: 38,
      creditAmount: 0,
    },
  };
}

export const initialDatabase: LocalDatabase = createInitialDatabase();

function normalizeDatabase(db: Partial<LocalDatabase>): LocalDatabase {
  const fallback = createInitialDatabase();
  return {
    activeCustomerId: db.activeCustomerId ?? fallback.activeCustomerId,
    categories: (db.categories ?? fallback.categories)
      .filter((category): category is CategoryOption => Boolean(category?.id) && Boolean(category?.name))
      .sort((left, right) => left.name.localeCompare(right.name)),
    products: (db.products ?? fallback.products).map((product) => {
      const originalPrice = typeof product.originalPrice === "number" ? product.originalPrice : product.price;
      const salePrice = typeof product.salePrice === "number" ? product.salePrice : null;
      const isOnSale = Boolean(product.isOnSale && salePrice != null && product.saleEndsAt);
      return {
        ...product,
        originalPrice,
        salePrice,
        salePercentage: typeof product.salePercentage === "number" ? product.salePercentage : null,
        saleEndsAt: product.saleEndsAt ?? null,
        isOnSale,
        archivedAt: product.archivedAt ?? null,
        homepageFeatured: Boolean(product.homepageFeatured),
        images: Array.isArray(product.images) ? product.images.filter((image): image is string => typeof image === "string" && image.length > 0) : [],
        imageRecords: Array.isArray(product.imageRecords) && product.imageRecords.length > 0
          ? product.imageRecords
            .filter((image) => Boolean(image?.id) && typeof image?.url === "string" && image.url.length > 0)
            .sort((left, right) => left.position - right.position)
          : (Array.isArray(product.images) ? product.images : [])
            .filter((image): image is string => typeof image === "string" && image.length > 0)
            .map((image, index) => ({ id: `${product.id}-image-${index}`, url: image, position: index })),
        price: isOnSale && salePrice != null ? salePrice : originalPrice,
      };
    }),
    customers: db.customers ?? fallback.customers,
    balanceCycle: db.balanceCycle ?? fallback.balanceCycle,
    claimedItems: db.claimedItems ?? fallback.claimedItems,
    paymentHistory: db.paymentHistory ?? fallback.paymentHistory,
    archivedInvoices: db.archivedInvoices ?? fallback.archivedInvoices,
    shipmentRecords: db.shipmentRecords ?? fallback.shipmentRecords,
    customerNotes: db.customerNotes ?? fallback.customerNotes,
    customerMessages: db.customerMessages ?? fallback.customerMessages,
    customerItemRequests: db.customerItemRequests ?? fallback.customerItemRequests,
    crossListedInventory: (db.crossListedInventory ?? fallback.crossListedInventory).map((entry) => ({
      ...entry,
      cost: typeof entry.cost === "number" ? entry.cost : null,
      platformDates: entry.platformDates ?? Object.fromEntries((entry.platforms ?? []).map((platform) => [platform, entry.updatedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)])),
    })),
    adminAuditLog: db.adminAuditLog ?? fallback.adminAuditLog,
    notifications: db.notifications ?? fallback.notifications,
    events: db.events ?? fallback.events,
    paymentDefaults: db.paymentDefaults ?? fallback.paymentDefaults,
  };
}

async function ensureDatabaseFile() {
  try {
    const raw = await readFile(dbPath, "utf8");
    const parsed = normalizeDatabase(JSON.parse(raw) as Partial<LocalDatabase>);
    await writeFile(dbPath, serialize(parsed), "utf8");
  } catch {
    await mkdir(dirname(dbPath), { recursive: true });
    await writeFile(dbPath, serialize(initialDatabase), "utf8");
  }
}

async function readDatabase(): Promise<LocalDatabase> {
  await ensureDatabaseFile();
  const raw = await readFile(dbPath, "utf8");
  return normalizeDatabase(JSON.parse(raw) as Partial<LocalDatabase>);
}

async function writeDatabase(db: LocalDatabase) {
  await writeFile(dbPath, serialize(db), "utf8");
}

export async function resetLocalDatabase() {
  await mkdir(dirname(dbPath), { recursive: true });
  await writeDatabase(createInitialDatabase());
}

function createNotification(type: AdminNotification["type"], label: string): AdminNotification {
  return {
    id: `notif-${Date.now()}`,
    type,
    label,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
}

function getRestockMessageLink(product: Product) {
  return `http://localhost:3000${getProductPath(product)}`;
}

function findCurrentCustomer(db: LocalDatabase) {
  const customer = db.customers.find((entry) => entry.id === db.activeCustomerId);

  if (!customer) {
    throw new Error("Active customer record is missing.");
  }

  return customer;
}

function formatCycleLabel(date: Date) {
  return `${date.toLocaleString("en-US", { month: "long" })} ${date.getFullYear()} cycle`;
}

function nextDueDateFromToday() {
  return getScheduledDueDateForDate(new Date().toISOString().slice(0, 10));
}

function findCustomerByName(db: LocalDatabase, customerName: string) {
  return db.customers.find((entry) => entry.displayName === customerName);
}

export async function getPlatformSummary() {
  return platformSummary;
}

export async function listProducts(options?: { includeArchived?: boolean }) {
  const db = await readDatabase();
  return options?.includeArchived
    ? db.products.filter((product) => product.status === "archived")
    : db.products.filter((product) => product.status !== "archived");
}

export async function listCategories() {
  const db = await readDatabase();
  return db.categories;
}

export async function getProductById(productId: string) {
  const db = await readDatabase();
  return db.products.find((product) => productMatchesLookup(product.id, productId) && product.status !== "archived") ?? null;
}

export async function getCurrentCustomer() {
  const db = await readDatabase();
  return findCurrentCustomer(db);
}

export async function setActiveCustomer(customerId: string) {
  const db = await readDatabase();
  const customer = db.customers.find((entry) => entry.id === customerId);

  if (!customer) {
    throw new Error("Customer record not found.");
  }

  db.activeCustomerId = customerId;
  await writeDatabase(db);
  return customer;
}

export async function listCustomers() {
  const db = await readDatabase();
  return db.customers;
}

export async function createPendingCustomerProfile(input: {
  displayName: string;
  email: string;
}) {
  const db = await readDatabase();
  const normalizedEmail = input.email.trim().toLowerCase();

  const exists = db.customers.some((entry) => entry.email.toLowerCase() === normalizedEmail);
  if (exists) {
    return { ok: false as const, message: "A customer with that email already exists." };
  }

  const customer = {
    id: `cust-${Date.now()}`,
    displayName: input.displayName.trim(),
    email: normalizedEmail,
      role: "customer" as const,
      accountState: "pending_approval" as const,
      timezone: "America/New_York",
      address: "No address on file yet",
      street: "",
      city: "",
      region: "",
      postalCode: "",
      creditBalance: 0,
    shipmentStatus: "none" as const,
    lastShipmentDate: null,
  };

  db.customers.push(customer);
  db.notifications.unshift(createNotification("pending_approval", `${customer.displayName} signed up and is waiting for approval.`));
  await writeDatabase(db);

  return { ok: true as const, customer };
}

export async function removeCustomerProfileById(customerId: string) {
  const db = await readDatabase();
  const customerIndex = db.customers.findIndex((entry) => entry.id === customerId);

  if (customerIndex === -1) {
    return { ok: false as const, message: "Customer not found." };
  }

  db.customers.splice(customerIndex, 1);
  db.notifications = db.notifications.filter(
    (entry) => !(entry.type === "pending_approval" && entry.label.includes("signed up and is waiting for approval")),
  );
  if (db.activeCustomerId === customerId) {
    db.activeCustomerId = initialDatabase.activeCustomerId;
  }
  await writeDatabase(db);

  return { ok: true as const };
}

export async function updateCurrentCustomerProfile(input: { street: string; city: string; region: string; postalCode: string; timezone: string }) {
  const db = await readDatabase();
  const customer = findCurrentCustomer(db);
  const street = input.street.trim();
  const city = input.city.trim();
  const region = input.region.trim();
  const postalCode = input.postalCode.trim();
  const timezone = input.timezone.trim();

  if (!street || !city || !region || !postalCode) {
    return { ok: false as const, message: "Street, city, state, and zip code are all required." };
  }

  if (!timezone) {
    return { ok: false as const, message: "Timezone is required." };
  }

  customer.street = street;
  customer.city = city;
  customer.region = region;
  customer.postalCode = postalCode;
  customer.address = `${street}, ${city}, ${region} ${postalCode}`;
  customer.timezone = timezone;
  await writeDatabase(db);

  return {
    ok: true as const,
    message: "Profile details updated.",
  };
}

export async function updateCustomerProfileByAdmin(
  customerId: string,
  input: { street: string; city: string; region: string; postalCode: string; timezone: string },
) {
  const db = await readDatabase();
  const customer = db.customers.find((entry) => entry.id === customerId);

  if (!customer) {
    return { ok: false as const, message: "Customer not found." };
  }

  const street = input.street.trim();
  const city = input.city.trim();
  const region = input.region.trim();
  const postalCode = input.postalCode.trim();
  const timezone = input.timezone.trim();

  if (!street || !city || !region || !postalCode) {
    return { ok: false as const, message: "Street, city, state, and zip code are all required." };
  }

  if (!timezone) {
    return { ok: false as const, message: "Timezone is required." };
  }

  customer.street = street;
  customer.city = city;
  customer.region = region;
  customer.postalCode = postalCode;
  customer.timezone = timezone;
  customer.address = `${street}, ${city}, ${region} ${postalCode}`;

  await writeDatabase(db);

  return {
    ok: true as const,
    message: `${customer.displayName} profile details updated.`,
  };
}

export async function getBalanceCycle() {
  const db = await readDatabase();
  return db.balanceCycle;
}

export async function listClaimedItems() {
  const db = await readDatabase();
  return db.claimedItems;
}

export async function listClaimedItemsForCustomer(_customerId: string) {
  const db = await readDatabase();
  return db.claimedItems;
}

export async function listArchivedInvoices() {
  const db = await readDatabase();
  return db.archivedInvoices;
}

export async function listArchivedInvoicesForCustomer(_customerId: string) {
  const db = await readDatabase();
  return db.archivedInvoices;
}

export async function listPaymentHistoryForCustomer(customerId: string): Promise<PaymentHistoryRecord[]> {
  const db = await readDatabase();
  return db.paymentHistory
    .filter((payment) => payment.customerId === customerId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function listClaimHistoryForCustomer(_customerId: string): Promise<ClaimHistoryRecord[]> {
  const db = await readDatabase();
  return db.claimedItems.map((item, index) => ({
    ...item,
    createdAt: item.createdAt ?? new Date(Date.now() - index * 86400000).toISOString(),
    cycleStatus: db.balanceCycle.status,
  }));
}

export async function listShipmentRecords() {
  const db = await readDatabase();
  return db.shipmentRecords;
}

export async function listShipmentRecordsForCustomer(customerId: string) {
  const db = await readDatabase();
  return db.shipmentRecords.filter((entry) => entry.customerId === customerId);
}

export async function listCustomerNotes(customerId?: string) {
  const db = await readDatabase();
  return customerId ? db.customerNotes.filter((entry) => entry.customerId === customerId) : db.customerNotes;
}

export async function listCustomerMessagesForCustomer(customerId: string, options?: { limit?: number }) {
  const db = await readDatabase();
  const messages = db.customerMessages
    .filter((entry) => entry.customerId === customerId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return typeof options?.limit === "number" ? messages.slice(0, options.limit) : messages;
}

export async function listCustomerItemRequests(customerId?: string, options?: { limit?: number }) {
  const db = await readDatabase();
  const requests = db.customerItemRequests
    .filter((entry) => !customerId || entry.customerId === customerId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return typeof options?.limit === "number" ? requests.slice(0, options.limit) : requests;
}

export async function listRestockRequests(customerId?: string) {
  const db = await readDatabase();
  const requests: RestockRequestRecord[] = db.notifications
    .filter((notification) => notification.type === "restock_request")
    .map((notification) => {
      const matchedCustomer = db.customers.find((entry) =>
        notification.label.startsWith(`${entry.displayName} requested a restock check for `),
      );
      const productTitle = matchedCustomer
        ? notification.label.replace(`${matchedCustomer.displayName} requested a restock check for `, "").replace(".", "")
        : notification.label.replace("Restock request received for ", "").replace(".", "");

      return {
        id: notification.id,
        customerId: matchedCustomer?.id ?? null,
        customerName: matchedCustomer?.displayName,
        productTitle,
        status: "open",
        createdAt: notification.createdAt,
        email: matchedCustomer?.email ?? null,
      };
    });

  return customerId ? requests.filter((request) => request.customerId === customerId) : requests;
}

export async function listNotifications(options?: { includeRead?: boolean }) {
  const db = await readDatabase();
  return options?.includeRead ? db.notifications : db.notifications.filter((entry) => !entry.readAt);
}

export async function listAdminAuditEntries(limit = 100) {
  const db = await readDatabase();
  return [...db.adminAuditLog]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export async function listCrossListedInventory(search?: string) {
  const db = await readDatabase();
  const trimmedSearch = search?.trim().toLowerCase() ?? "";
  const records = [...db.crossListedInventory].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  if (!trimmedSearch) {
    return records;
  }

  return records.filter((entry) =>
    entry.sku.toLowerCase().includes(trimmedSearch)
    || entry.itemName.toLowerCase().includes(trimmedSearch)
    || entry.platforms.some((platform) => platform.toLowerCase().includes(trimmedSearch))
  );
}

export async function listEvents() {
  const db = await readDatabase();
  return db.events;
}

export async function getEventById(eventId: string) {
  const db = await readDatabase();
  return db.events.find((event) => event.id === eventId) ?? null;
}

export async function getPaymentDefaults() {
  const db = await readDatabase();
  return db.paymentDefaults;
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const db = await readDatabase();
  const currentCustomer = findCurrentCustomer(db);
  const amountDue = calculateBalanceDue(db.balanceCycle);
  const overdueEntries = [
    {
      customer: currentCustomer.displayName,
      customerId: currentCustomer.id,
      amount: amountDue,
      invoiceAmount: Math.max(db.balanceCycle.subtotal + db.balanceCycle.adjustments - db.balanceCycle.paymentsApplied - db.balanceCycle.creditsApplied, 0),
      shippingAmount: Math.max(db.balanceCycle.shipping, 0),
      overdue: isBalanceOverdue(db.balanceCycle, new Date().toISOString().slice(0, 10)),
    },
    {
      customer: "Casey Morgan",
      customerId: "cust-002",
      amount: 118,
      invoiceAmount: 96,
      shippingAmount: 22,
      overdue: true,
    },
    {
      customer: "Taylor West",
      customerId: "cust-003",
      amount: 76,
      invoiceAmount: 64,
      shippingAmount: 12,
      overdue: false,
    },
  ];
  const topCustomers = [
    { customer: currentCustomer.displayName, customerId: currentCustomer.id, totalSpent: 196, invoiceCount: 2 },
    { customer: "Casey Morgan", customerId: "cust-002", totalSpent: 162, invoiceCount: 2 },
    { customer: "Taylor West", customerId: "cust-003", totalSpent: 136, invoiceCount: 1 },
  ];
  const recentPayments: PaymentHistoryRecord[] = [...db.paymentHistory]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);
  const recentInvoices = db.archivedInvoices.map((invoice) => ({
    ...invoice,
    customer: currentCustomer.displayName,
    customerId: currentCustomer.id,
  }));
  const monthlyInvoiceTotals = db.archivedInvoices.reduce<Array<{ monthKey: string; monthLabel: string; total: number; invoiceCount: number }>>((rows, invoice) => {
    const monthKey = invoice.paidAt.slice(0, 7);
    const existing = rows.find((row) => row.monthKey === monthKey);
    if (existing) {
      existing.total += invoice.total;
      existing.invoiceCount += 1;
      return rows;
    }
    rows.push({
      monthKey,
      monthLabel: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${monthKey}-01T12:00:00Z`)),
      total: invoice.total,
      invoiceCount: 1,
    });
    return rows;
  }, []).sort((left, right) => right.monthKey.localeCompare(left.monthKey));
  const monthlyPaymentTotals = db.paymentHistory.reduce<Array<{ monthKey: string; monthLabel: string; total: number; paymentCount: number }>>((rows, payment) => {
    const monthKey = payment.createdAt.slice(0, 7);
    const existing = rows.find((row) => row.monthKey === monthKey);
    if (existing) {
      existing.total += payment.amount;
      existing.paymentCount += 1;
      return rows;
    }
    rows.push({
      monthKey,
      monthLabel: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${monthKey}-01T12:00:00Z`)),
      total: payment.amount,
      paymentCount: 1,
    });
    return rows;
  }, []).sort((left, right) => right.monthKey.localeCompare(left.monthKey));
  const monthlyCustomerSpend = monthlyInvoiceTotals.map((row) => ({
    monthKey: row.monthKey,
    monthLabel: row.monthLabel,
    customer: currentCustomer.displayName,
    customerId: currentCustomer.id,
    totalSpent: Math.max(0, row.total - 20),
    invoiceCount: row.invoiceCount,
  }));
  const latePaymentWatchlist = overdueEntries
    .filter((entry) => entry.overdue)
    .map((entry) => ({
      customer: entry.customer,
      customerId: entry.customerId,
      overdueAmount: entry.amount,
      invoiceAmount: entry.invoiceAmount,
      shippingAmount: entry.shippingAmount,
      lastPaymentAt: recentPayments[0]?.createdAt,
    }));
  const customerLifetimeSummary = [
    {
      customer: currentCustomer.displayName,
      customerId: currentCustomer.id,
      lifetimeSpent: recentInvoices.reduce((sum, invoice) => sum + Math.max(0, invoice.total - Number(invoice.shippingTotal ?? 0)), 0),
      lifetimePaid: recentInvoices.reduce((sum, invoice) => sum + invoice.paymentTotal + invoice.creditApplied, 0),
      invoiceCount: recentInvoices.length,
      paymentCount: db.paymentHistory.length,
      shipmentCount: db.shipmentRecords.filter((shipment) => shipment.status === "completed").length,
      lastPaymentAt: recentPayments[0]?.createdAt,
    },
  ];
  const monthlyShipmentVolume = db.shipmentRecords
    .filter((shipment) => shipment.status === "completed" && (shipment.shipmentDate || shipment.requestedAt))
    .reduce<Array<{ monthKey: string; monthLabel: string; shipmentCount: number }>>((rows, shipment) => {
      const monthKey = String(shipment.shipmentDate ?? shipment.requestedAt).slice(0, 7);
      const existing = rows.find((row) => row.monthKey === monthKey);
      if (existing) {
        existing.shipmentCount += 1;
        return rows;
      }
      rows.push({
        monthKey,
        monthLabel: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${monthKey}-01T12:00:00Z`)),
        shipmentCount: 1,
      });
      return rows;
    }, [])
    .sort((left, right) => right.monthKey.localeCompare(left.monthKey));
  const inventoryMarginByCategory = db.products.reduce<Array<{
    category: string;
    itemCount: number;
    units: number;
    retailValue: number;
    costValue: number;
    estimatedGrossProfit: number;
  }>>((rows, product) => {
    if (product.status === "archived" || product.status === "draft" || product.status === "hidden") {
      return rows;
    }
    const existing = rows.find((row) => row.category === product.category);
    const retailValue = product.price * product.quantity;
    const costValue = Number(product.cost ?? 0) * product.quantity;
    if (existing) {
      existing.itemCount += 1;
      existing.units += product.quantity;
      existing.retailValue += retailValue;
      existing.costValue += costValue;
      existing.estimatedGrossProfit += retailValue - costValue;
      return rows;
    }
    rows.push({
      category: product.category,
      itemCount: 1,
      units: product.quantity,
      retailValue,
      costValue,
      estimatedGrossProfit: retailValue - costValue,
    });
    return rows;
  }, []).sort((left, right) => right.estimatedGrossProfit - left.estimatedGrossProfit);
  const today = new Date().toISOString().slice(0, 10);
  const inventoryRows = db.products
    .filter((product) => product.status !== "archived" && product.status !== "draft" && product.status !== "hidden")
    .map((product) => {
      const assumedCreatedDate = product.archivedAt?.slice(0, 10) ?? today;
      const productAgeSeed = product.id === "prod-001" ? "2026-01-10" : product.id === "prod-002" ? "2026-03-01" : "2026-02-05";
      const createdDate = productAgeSeed || assumedCreatedDate;
      const daysListed = Math.max(0, Math.floor((new Date(`${today}T00:00:00.000Z`).getTime() - new Date(`${createdDate}T00:00:00.000Z`).getTime()) / 86400000));
      return {
        productId: product.id,
        title: product.title,
        category: product.category,
        quantity: product.quantity,
        daysListed,
        retailValue: product.price * product.quantity,
        costValue: Number(product.cost ?? 0) * product.quantity,
      };
    });
  const inventoryAgingBuckets = [
    { label: "0-30 days", itemCount: 0, units: 0, retailValue: 0, costValue: 0 },
    { label: "31-60 days", itemCount: 0, units: 0, retailValue: 0, costValue: 0 },
    { label: "61-90 days", itemCount: 0, units: 0, retailValue: 0, costValue: 0 },
    { label: "91+ days", itemCount: 0, units: 0, retailValue: 0, costValue: 0 },
  ];
  for (const row of inventoryRows) {
    const bucket = row.daysListed <= 30
      ? inventoryAgingBuckets[0]
      : row.daysListed <= 60
        ? inventoryAgingBuckets[1]
        : row.daysListed <= 90
          ? inventoryAgingBuckets[2]
          : inventoryAgingBuckets[3];
    bucket.itemCount += 1;
    bucket.units += row.quantity;
    bucket.retailValue += row.retailValue;
    bucket.costValue += row.costValue;
  }
  const restockDemand = (await listRestockRequests())
    .reduce<Array<{ productTitle: string; requestCount: number; openCount: number; customerCount: number }>>((rows, request) => {
      const existing = rows.find((row) => row.productTitle === request.productTitle);
      if (existing) {
        existing.requestCount += 1;
        existing.openCount += request.status === "open" ? 1 : 0;
        existing.customerCount += request.customerId ? 1 : 0;
        return rows;
      }
      rows.push({
        productTitle: request.productTitle,
        requestCount: 1,
        openCount: request.status === "open" ? 1 : 0,
        customerCount: request.customerId ? 1 : 0,
      });
      return rows;
    }, [])
    .sort((left, right) => right.requestCount - left.requestCount);
  const itemRequestDemand = db.customerItemRequests
    .reduce<Array<{ request: string; requestCount: number; customerCount: number; latestRequestAt?: string }>>((rows, request) => {
      const existing = rows.find((row) => row.request === request.request);
      if (existing) {
        existing.requestCount += 1;
        existing.customerCount += request.customerId ? 1 : 0;
        existing.latestRequestAt = existing.latestRequestAt && existing.latestRequestAt > request.createdAt ? existing.latestRequestAt : request.createdAt;
        return rows;
      }
      rows.push({
        request: request.request,
        requestCount: 1,
        customerCount: request.customerId ? 1 : 0,
        latestRequestAt: request.createdAt,
      });
      return rows;
    }, [])
    .sort((left, right) => right.requestCount - left.requestCount);

  return {
    totalRunningBalance: overdueEntries.reduce((sum, entry) => sum + entry.amount, 0),
    unpaidTotal: overdueEntries.reduce((sum, entry) => sum + entry.amount, 0),
    unpaidInvoiceTotal: overdueEntries.reduce((sum, entry) => sum + entry.invoiceAmount, 0),
    unpaidShippingTotal: overdueEntries.reduce((sum, entry) => sum + entry.shippingAmount, 0),
    paymentsThisCycle: db.balanceCycle.paymentsApplied,
    overdueCustomerCount: overdueEntries.filter((entry) => entry.overdue).length,
    overdueTotal: overdueEntries.filter((entry) => entry.overdue).reduce((sum, entry) => sum + entry.amount, 0),
    archivedInvoiceRevenue: db.archivedInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
    lifetimeCollected: db.archivedInvoices.reduce((sum, invoice) => sum + invoice.paymentTotal + invoice.creditApplied, 0),
    customerBalances: overdueEntries,
    topCustomers,
    recentPayments,
    recentInvoices,
    monthlyInvoiceTotals,
    monthlyPaymentTotals,
    monthlyCustomerSpend,
    latePaymentWatchlist,
    customerLifetimeSummary,
    monthlyShipmentVolume,
    restockDemand,
    itemRequestDemand,
    inventoryRetailValue: inventoryRows.reduce((sum, row) => sum + row.retailValue, 0),
    inventoryCostBasis: inventoryRows.reduce((sum, row) => sum + row.costValue, 0),
    inventoryEstimatedGrossProfit: inventoryRows.reduce((sum, row) => sum + row.retailValue - row.costValue, 0),
    inventoryMarginByCategory,
    inventoryAgingBuckets,
    stalestInventory: [...inventoryRows]
      .sort((left, right) => right.daysListed - left.daysListed)
      .slice(0, 12),
  };
}

export async function createEventInDatabase(input: {
  title: string;
  startsAtLocal: string;
  description: string;
  externalLink: string;
  platform: string;
  timeZone: string;
  repeatWeekly?: boolean;
  repeatUntilLocal?: string;
}) {
  const db = await readDatabase();
  const title = input.title.trim();
  if (!title) {
    return { ok: false, message: "Event title is required." };
  }

  const { buildWeeklyRecurringLocalDateTimes, zonedLocalDateTimeToIso } = await import("../events");
  const startsAtLocalValues = buildWeeklyRecurringLocalDateTimes(
    input.startsAtLocal,
    input.repeatWeekly ?? false,
    input.repeatUntilLocal ?? "",
  );

  db.events = [
    ...startsAtLocalValues.map((startsAtLocal, index) => ({
      id: `event-${Date.now()}-${index}`,
      title,
      startsAt: zonedLocalDateTimeToIso(startsAtLocal, input.timeZone),
      description: input.description.trim(),
      externalLink: input.externalLink.trim(),
      platform: input.platform.trim() || undefined,
    })),
    ...db.events,
  ].sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  await writeDatabase(db);
  return {
    ok: true,
    message:
      startsAtLocalValues.length === 1
        ? `${title} was added to the events calendar.`
        : `${title} was added to the events calendar ${startsAtLocalValues.length} times.`,
  };
}

export async function updateEventInDatabase(input: {
  eventId: string;
  title: string;
  startsAtLocal: string;
  description: string;
  externalLink: string;
  platform: string;
  timeZone: string;
}) {
  const db = await readDatabase();
  const eventId = input.eventId.trim();
  const title = input.title.trim();
  if (!eventId) {
    return { ok: false, message: "Event record is missing." };
  }
  if (!title) {
    return { ok: false, message: "Event title is required." };
  }
  if (!input.startsAtLocal) {
    return { ok: false, message: "Event date and time are required." };
  }

  const event = db.events.find((entry) => entry.id === eventId);
  if (!event) {
    return { ok: false, message: "Event record not found." };
  }

  const { zonedLocalDateTimeToIso } = await import("../events");
  event.title = title;
  event.startsAt = zonedLocalDateTimeToIso(input.startsAtLocal, input.timeZone);
  event.description = input.description.trim();
  event.externalLink = input.externalLink.trim();
  event.platform = input.platform.trim() || undefined;

  db.events.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  await writeDatabase(db);
  return { ok: true, message: `${title} was updated.` };
}

export async function deleteEventInDatabase(eventId: string) {
  const db = await readDatabase();
  const trimmed = eventId.trim();
  const before = db.events.length;
  db.events = db.events.filter((event) => event.id !== trimmed);
  await writeDatabase(db);
  return before === db.events.length
    ? { ok: false, message: "Event record not found." }
    : { ok: true, message: "Event deleted." };
}

export async function saveCrossListedInventoryToDatabase(input: {
  sku: string;
  itemName: string;
  cost?: number | null;
  platforms: string[];
}) {
  const db = await readDatabase();
  const sku = input.sku.trim();
  const itemName = input.itemName.trim();
  const hasCost = input.cost != null;
  const cost = hasCost ? Number(input.cost) : null;
  const platforms = input.platforms.filter((entry): entry is CrossListedInventoryRecord["platforms"][number] => typeof entry === "string" && entry.length > 0);

  if (!sku) {
    return { ok: false, message: "SKU is required." };
  }

  if (!itemName) {
    return { ok: false, message: "Item name is required." };
  }

  if (cost != null && (!Number.isFinite(cost) || cost < 0)) {
    return { ok: false, message: "Cost must be zero or higher." };
  }

  if (platforms.length === 0) {
    return { ok: false, message: "Select at least one platform." };
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const existing = db.crossListedInventory.find((entry) => entry.sku.toLowerCase() === sku.toLowerCase());

  if (existing) {
    const nextPlatformDates = Object.fromEntries(
      platforms.map((platform) => [platform, existing.platformDates?.[platform] ?? today]),
    );
    existing.itemName = itemName;
    existing.cost = cost ?? existing.cost ?? null;
    existing.platforms = platforms;
    existing.platformDates = nextPlatformDates;
    existing.updatedAt = now;
  } else {
    db.crossListedInventory.unshift({
      id: `cross-${Date.now()}`,
      sku,
      itemName,
      cost,
      platforms,
      platformDates: Object.fromEntries(platforms.map((platform) => [platform, today])),
      updatedAt: now,
    });
  }

  await writeDatabase(db);
  return { ok: true, message: `Cross-listed inventory saved for SKU ${sku}.` };
}

export async function deleteCrossListedInventoryFromDatabase(recordId: string) {
  const db = await readDatabase();
  const existing = db.crossListedInventory.find((entry) => entry.id === recordId);

  if (!existing) {
    return { ok: false, message: "Cross-listed item not found." };
  }

  db.crossListedInventory = db.crossListedInventory.filter((entry) => entry.id !== recordId);
  await writeDatabase(db);
  return { ok: true, message: `Removed SKU ${existing.sku} from cross-listed inventory.` };
}

export async function submitClaimToDatabase(productId: string, requestedQuantity: number) {
  const db = await readDatabase();
  const customer = findCurrentCustomer(db);
  const product = db.products.find((entry) => entry.id === productId);

  if (!product) {
    return { ok: false, message: "Product not found." };
  }

  const preview = validateClaimAttempt({
    role: customer.role,
    accountState: customer.accountState,
    availableQuantity: product.quantity,
    requestedQuantity,
  });

  if (!preview.ok) {
    return preview;
  }

  product.quantity -= requestedQuantity;
  product.status = deriveProductStatus(product.quantity, product.status);
  db.balanceCycle.subtotal += product.price * requestedQuantity;
  db.claimedItems.unshift({
    id: `claim-${Date.now()}`,
    productTitle: product.title,
    quantity: requestedQuantity,
    unitPrice: product.price,
    status: "claimed",
  });
  db.notifications.unshift(
    createNotification("new_claim", `${customer.displayName} claimed ${requestedQuantity} x ${product.title}.`),
  );

  if (product.quantity === 1) {
    db.notifications.unshift(createNotification("low_stock", `${product.title} reached low stock.`));
  }

  await writeDatabase(db);

  return {
    ok: true,
    message: `${product.title} has been added to the active running balance.`,
  };
}

export async function adjustInventoryInDatabase(productId: string, quantityChange: number) {
  const db = await readDatabase();
  const product = db.products.find((entry) => entry.id === productId);

  if (!product) {
    return { ok: false, message: "Product not found." };
  }

  const previousQuantity = product.quantity;
  const nextQuantity = product.quantity + quantityChange;
  if (nextQuantity < 0) {
    return { ok: false, message: "Inventory cannot go below zero." };
  }

  product.quantity = nextQuantity;
  product.status = deriveProductStatus(product.quantity, product.status);

  if (product.quantity === 1) {
    db.notifications.unshift(createNotification("low_stock", `${product.title} reached low stock.`));
  }

  if (previousQuantity === 0 && nextQuantity > 0) {
    const restockMessageLink = getRestockMessageLink(product);
    const matchingRequests = db.notifications.filter((entry) => entry.type === "restock_request" && entry.label.includes(product.title));
    const matchingCustomers = db.customerMessages
      .filter((entry) => entry.senderRole === "customer" && entry.message.includes(product.title))
      .map((entry) => entry.customerId);
    const uniqueCustomerIds = [...new Set(matchingCustomers)];

    for (const customerId of uniqueCustomerIds) {
      const customer = db.customers.find((entry) => entry.id === customerId);
      if (!customer) {
        continue;
      }

      db.customerMessages.unshift({
        id: `msg-${Date.now()}-${customerId}`,
        customerId,
        customerName: customer.displayName,
        senderRole: "admin",
        message: `Hi ${customer.displayName}, you asked if I could get more of ${product.title}. It's now back in stock here: ${restockMessageLink}`,
        createdAt: new Date().toISOString(),
      });
    }

    if (matchingRequests.length > 0) {
      db.notifications = db.notifications.filter((entry) => !(entry.type === "restock_request" && entry.label.includes(product.title)));
    }
  }

  await writeDatabase(db);

  return {
    ok: true,
    message: `${product.title} inventory updated to ${product.quantity}.`,
  };
}

export async function updateProductSaleInDatabase(productId: string, salePercentage: number, saleEndsAt: string) {
  const db = await readDatabase();
  const product = db.products.find((entry) => entry.id === productId);

  if (!product) {
    return { ok: false, message: "Product not found." };
  }

  if (!Number.isFinite(salePercentage) || salePercentage <= 0 || salePercentage >= 100) {
    return { ok: false, message: "Sale percentage must be between 1 and 99." };
  }

  if (!saleEndsAt) {
    return { ok: false, message: "Sale end date is required." };
  }

  const endsAtIso = `${saleEndsAt}T23:59:59.000Z`;
  const salePrice = Math.round(product.originalPrice * (1 - salePercentage / 100) * 100) / 100;

  product.salePercentage = salePercentage;
  product.saleEndsAt = endsAtIso;
  product.salePrice = salePrice;
  product.isOnSale = true;
  product.price = salePrice;
  await writeDatabase(db);

  return {
    ok: true,
    message: `${product.title} is now ${salePercentage}% off through ${saleEndsAt}.`,
  };
}

export async function updateHomepageFeaturedInDatabase(productId: string, featured: boolean) {
  const db = await readDatabase();
  const product = db.products.find((entry) => entry.id === productId);

  if (!product) {
    return { ok: false, message: "Product not found." };
  }

  product.homepageFeatured = featured;
  await writeDatabase(db);

  return {
    ok: true,
    message: featured
      ? `${product.title} will appear as a homepage top pick.`
      : `${product.title} was removed from homepage top picks.`,
  };
}

export async function clearProductSaleInDatabase(productId: string) {
  const db = await readDatabase();
  const product = db.products.find((entry) => entry.id === productId);

  if (!product) {
    return { ok: false, message: "Product not found." };
  }

  product.salePercentage = null;
  product.saleEndsAt = null;
  product.salePrice = null;
  product.isOnSale = false;
  product.price = product.originalPrice;
  await writeDatabase(db);

  return {
    ok: true,
    message: `${product.title} sale pricing was cleared.`,
  };
}

export async function archiveProductInDatabase(productId: string) {
  const db = await readDatabase();
  const product = db.products.find((entry) => entry.id === productId);
  if (!product) return { ok: false, message: "Product not found." };

  product.status = "archived";
  product.archivedAt = new Date().toISOString();
  product.salePercentage = null;
  product.saleEndsAt = null;
  product.salePrice = null;
  product.isOnSale = false;
  product.price = product.originalPrice;
  await writeDatabase(db);

  return { ok: true, message: `${product.title} was moved to archived items.` };
}

export async function deleteArchivedProductInDatabase(productId: string) {
  const db = await readDatabase();
  const productIndex = db.products.findIndex((entry) => entry.id === productId);
  if (productIndex === -1) return { ok: false, message: "Product not found." };

  const product = db.products[productIndex];
  if (product.status !== "archived") return { ok: false, message: "Only archived items can be deleted." };

  db.products.splice(productIndex, 1);
  await writeDatabase(db);
  return { ok: true, message: `${product.title} was permanently deleted.` };
}

export async function createInventoryItemInDatabase(input: {
  title: string;
  description: string;
  price: number;
  cost: number;
  quantity: number;
  category: string;
  sku: string;
  location: string;
  images: File[];
}) {
  const db = await readDatabase();
  const title = input.title.trim();
  const category = input.category.trim();
  const description = input.description.trim();
  const price = Number(input.price);
  const cost = Number(input.cost);
  const quantity = Number(input.quantity);
  const sku = input.sku.trim();
  const images = input.images.filter((file) => file instanceof File);

  if (!title) {
    return { ok: false, message: "Item title is required." };
  }

  if (!category) {
    return { ok: false, message: "Category is required." };
  }

  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, message: "Price must be zero or higher." };
  }

  if (!Number.isFinite(cost) || cost < 0) {
    return { ok: false, message: "Cost must be zero or higher." };
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    return { ok: false, message: "Starting quantity must be zero or higher." };
  }

  if (!sku) {
    return { ok: false, message: "SKU is required so the item can be tracked in cross-listed inventory." };
  }

  db.products.unshift({
    id: `prod-${Date.now()}`,
    title,
    description,
    price,
    cost,
    originalPrice: price,
    salePrice: null,
    salePercentage: null,
    saleEndsAt: null,
    isOnSale: false,
    archivedAt: null,
    homepageFeatured: false,
    category,
    quantity,
      status: deriveProductStatus(quantity, "active"),
      images: images.map((image) => `/api/admin/product-images?preview=${encodeURIComponent(image.name)}`),
      imageRecords: images.map((image, index) => ({
        id: `prod-${Date.now()}-image-${index}`,
        url: `/api/admin/product-images?preview=${encodeURIComponent(image.name)}`,
        position: index,
      })),
    });

  const today = new Date().toISOString();
  const existingCrossListed = db.crossListedInventory.find((entry) => entry.sku.toLowerCase() === sku.toLowerCase());
  if (existingCrossListed) {
    existingCrossListed.itemName = title;
    existingCrossListed.cost = cost;
    existingCrossListed.platforms = Array.from(new Set([...existingCrossListed.platforms, "Website"]));
    existingCrossListed.platformDates = {
      ...existingCrossListed.platformDates,
      Website: existingCrossListed.platformDates.Website ?? today.slice(0, 10),
    };
    existingCrossListed.updatedAt = today;
  } else {
    db.crossListedInventory.unshift({
      id: `cross-${Date.now()}-${sku}`,
      sku,
      itemName: title,
      cost,
      platforms: ["Website"],
      platformDates: { Website: today.slice(0, 10) },
      updatedAt: today,
    });
  }

  if (!db.categories.some((entry) => entry.name.toLowerCase() === category.toLowerCase())) {
    db.categories.push({
      id: `cat-${Date.now()}`,
      name: category,
    });
    db.categories.sort((left, right) => left.name.localeCompare(right.name));
  }

  await writeDatabase(db);

  return {
    ok: true,
    message: `${title} was added with ${images.length} photo${images.length === 1 ? "" : "s"}, ${quantity} item${quantity === 1 ? "" : "s"} on hand, and a Website entry in cross-listed inventory.`,
  };
}

export async function createInventoryItemsBulkInDatabase(input: Array<{
  title: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  sku: string;
  location: string;
}>) {
  const db = await readDatabase();

  if (input.length === 0) {
    return { ok: false, message: "Add at least one inventory row to import." };
  }

  for (const row of input) {
    const title = row.title.trim();
    const category = row.category.trim();
    const description = row.description.trim();
    const price = Number(row.price);
    const quantity = Number(row.quantity);

    if (!title) {
      return { ok: false, message: "Every imported row needs an item title." };
    }

    if (!category) {
      return { ok: false, message: "Every imported row needs a category." };
    }

    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, message: `Price must be zero or higher for ${title}.` };
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      return { ok: false, message: `Starting quantity must be zero or higher for ${title}.` };
    }

    db.products.unshift({
      id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      description,
      price,
      originalPrice: price,
      salePrice: null,
      salePercentage: null,
      saleEndsAt: null,
      isOnSale: false,
      archivedAt: null,
      homepageFeatured: false,
      category,
      quantity,
      status: deriveProductStatus(quantity, "active"),
      images: [],
      imageRecords: [],
    });

    if (!db.categories.some((entry) => entry.name.toLowerCase() === category.toLowerCase())) {
      db.categories.push({
        id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: category,
      });
    }
  }

  db.categories.sort((left, right) => left.name.localeCompare(right.name));

  await writeDatabase(db);

  return {
    ok: true,
    message: `${input.length} inventory item${input.length === 1 ? "" : "s"} imported successfully.`,
  };
}

export async function createCategoryInDatabase(name: string) {
  const db = await readDatabase();
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { ok: false, message: "Category name is required." };
  }

  if (db.categories.some((entry) => entry.name.toLowerCase() === trimmedName.toLowerCase())) {
    return { ok: false, message: "That category already exists." };
  }

  db.categories.push({
    id: `cat-${Date.now()}`,
    name: trimmedName,
  });
  db.categories.sort((left, right) => left.name.localeCompare(right.name));
  await writeDatabase(db);

  return { ok: true, message: `${trimmedName} was added to categories.` };
}

export async function deleteCategoryInDatabase(categoryId: string) {
  const db = await readDatabase();
  const category = db.categories.find((entry) => entry.id === categoryId);

  if (!category) {
    return { ok: false, message: "Category not found." };
  }

  const inUse = db.products.some((product) => product.category.toLowerCase() === category.name.toLowerCase());
  if (inUse) {
    return { ok: false, message: "This category is still being used by inventory items." };
  }

  db.categories = db.categories.filter((entry) => entry.id !== categoryId);
  await writeDatabase(db);

  return { ok: true, message: `${category.name} was removed from categories.` };
}

export async function submitRestockRequestToDatabase(productId: string) {
  const db = await readDatabase();
  const product = db.products.find((entry) => entry.id === productId);
  const customer = findCurrentCustomer(db);

  if (!product) {
    return { ok: false, message: "Product not found." };
  }

  const label = `${customer.displayName} requested a restock check for ${product.title}.`;
  const alreadyRequested = db.notifications.some((entry) => entry.type === "restock_request" && entry.label === label);

  if (alreadyRequested) {
    return {
      ok: true,
      message: "A restock request for this item is already in the admin queue.",
    };
  }

  db.notifications.unshift(createNotification("restock_request", label));
  await writeDatabase(db);

  return {
    ok: true,
    message: "The admin team has been asked about getting more of this item.",
  };
}

export async function submitCustomerItemRequestToDatabase(request: string) {
  const db = await readDatabase();
  const customer = findCurrentCustomer(db);
  const trimmedRequest = request.trim();

  if (!trimmedRequest) {
    return { ok: false, message: "Add a request before sending it." };
  }

  const preview = trimmedRequest.length > 90 ? `${trimmedRequest.slice(0, 87)}...` : trimmedRequest;

  db.customerItemRequests.unshift({
    id: `item-request-${Date.now()}`,
    customerId: customer.id,
    customerName: customer.displayName,
    request: trimmedRequest,
    status: "open",
    createdAt: new Date().toISOString(),
  });
  db.notifications.unshift(
    createNotification("customer_item_request", `${customer.displayName} requested help finding an item: ${preview}`),
  );
  await writeDatabase(db);

  return {
    ok: true,
    message: "Your item request was sent to the admin team.",
  };
}

export async function submitCustomerMessageToDatabase(message: string) {
  const db = await readDatabase();
  const customer = findCurrentCustomer(db);
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return { ok: false, message: "Enter a message before sending it." };
  }

  db.customerMessages.unshift({
    id: `msg-${Date.now()}`,
    customerId: customer.id,
    customerName: customer.displayName,
    senderRole: "customer",
    message: trimmedMessage,
    createdAt: new Date().toISOString(),
  });
  db.notifications.unshift(
    createNotification("customer_message", `${customer.displayName}: ${trimmedMessage}`),
  );
  await writeDatabase(db);

  return {
    ok: true,
    message: "Your message was sent to the admin team.",
  };
}

export async function replyToCustomerMessage(customerId: string, message: string) {
  const db = await readDatabase();
  const customer = db.customers.find((entry) => entry.id === customerId);
  const trimmedMessage = message.trim();

  if (!customer) {
    return { ok: false, message: "Customer not found." };
  }

  if (!trimmedMessage) {
    return { ok: false, message: "Enter a reply before sending it." };
  }

  db.customerMessages.unshift({
    id: `msg-${Date.now()}`,
    customerId,
    customerName: customer.displayName,
    senderRole: "admin",
    message: trimmedMessage,
    createdAt: new Date().toISOString(),
  });
  await writeDatabase(db);

  return {
    ok: true,
    message: `Reply saved for ${customer.displayName}.`,
  };
}

export async function submitShipmentRequestToDatabase() {
  const db = await readDatabase();
  const customer = findCurrentCustomer(db);
  const allowed = canRequestShipment(customer.accountState, customer.shipmentStatus);

  if (!allowed) {
    return {
      ok: false,
      message: "Shipment request is blocked for this account.",
    };
  }

  const nextStatus = nextShipmentStatus(customer.shipmentStatus, "request");
  customer.shipmentStatus = nextStatus;
  db.shipmentRecords.unshift({
    id: `ship-${Date.now()}`,
    customerId: customer.id,
    customerName: customer.displayName,
    status: nextStatus,
    requestedAt: new Date().toISOString(),
    trackingNumber: null,
    shippingInvoice: null,
    shipmentDate: null,
  });
  db.notifications.unshift(
    createNotification("shipment_request", `${customer.displayName} requested shipment confirmation.`),
  );
  await writeDatabase(db);

  return {
    ok: true,
    message: "Shipment request submitted for admin review.",
    nextStatus,
  };
}

export async function addCustomerToShipmentQueue(customerId: string) {
  const db = await readDatabase();
  const customer = db.customers.find((entry) => entry.id === customerId);

  if (!customer) {
    return { ok: false, message: "Customer record not found." };
  }

  const allowed = canRequestShipment(customer.accountState, customer.shipmentStatus);
  if (!allowed) {
    return { ok: false, message: "Shipment request is blocked for this account." };
  }

  const existingShipment = db.shipmentRecords.find((entry) => entry.customerId === customer.id && entry.status !== "completed");
  if (existingShipment) {
    return { ok: true, message: `${customer.displayName} is already in the shipment queue.` };
  }

  const nextStatus = nextShipmentStatus(customer.shipmentStatus, "request");
  customer.shipmentStatus = nextStatus;
  db.shipmentRecords.unshift({
    id: `ship-${Date.now()}`,
    customerId: customer.id,
    customerName: customer.displayName,
    status: nextStatus,
    requestedAt: new Date().toISOString(),
    trackingNumber: null,
    shippingInvoice: null,
    shipmentDate: null,
  });
  db.notifications.unshift(
    createNotification("shipment_request", `${customer.displayName} was added to the shipment queue by admin.`),
  );
  await writeDatabase(db);

  return {
    ok: true,
    message: `${customer.displayName} was added to the shipment queue.`,
    nextStatus,
  };
}

export async function cancelShipmentRequestInDatabase(shipmentId?: string) {
  const db = await readDatabase();
  const customer = findCurrentCustomer(db);

  const shipmentIndex = shipmentId
    ? db.shipmentRecords.findIndex((entry) => entry.id === shipmentId)
    : db.shipmentRecords.findIndex((entry) => entry.customerId === customer.id && entry.status !== "completed");

  if (shipmentIndex === -1) {
    return { ok: false, message: "Open shipment request not found." };
  }

  const shipment = db.shipmentRecords[shipmentIndex];
  if (shipment.status === "completed") {
    return { ok: false, message: "Completed shipments cannot be canceled." };
  }

  db.shipmentRecords.splice(shipmentIndex, 1);

  const shipmentCustomer = findCustomerByName(db, shipment.customerName);
  if (shipmentCustomer) {
    shipmentCustomer.shipmentStatus = "none";
  }

  await writeDatabase(db);

  return {
    ok: true,
    message: `${shipment.customerName} shipment request was canceled.`,
    nextStatus: "none",
  };
}

export async function updateShipmentInDatabase(
  shipmentId: string,
  nextStatus: ShipmentStatus,
  trackingNumber: string,
  shippingInvoice: string,
) {
  const db = await readDatabase();
  const shipment = db.shipmentRecords.find((entry) => entry.id === shipmentId);

  if (!shipment) {
    return { ok: false, message: "Shipment record not found." };
  }

  const parseAmount = (value: string | null | undefined) => {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) return 0;
    const normalized = trimmed.replace(/[$,\s]/g, "");
    if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
    return Number(normalized);
  };

  const previousShippingAmount = parseAmount(shipment.shippingInvoice);
  const nextShippingAmount = parseAmount(shippingInvoice);
  shipment.status = nextStatus;
  shipment.trackingNumber = trackingNumber.trim() || null;
  shipment.shippingInvoice = shippingInvoice.trim() || null;
  shipment.shipmentDate = nextStatus === "completed" ? new Date().toISOString().slice(0, 10) : shipment.shipmentDate;

  const shippingDelta = (nextShippingAmount ?? 0) - (previousShippingAmount ?? 0);
  if (shippingDelta !== 0) {
    db.balanceCycle.shipping = Math.max(0, db.balanceCycle.shipping + shippingDelta);
  }

  const customer = shipment.customerId
    ? db.customers.find((entry) => entry.id === shipment.customerId)
    : findCustomerByName(db, shipment.customerName);
  if (customer) {
    customer.shipmentStatus = nextStatus;
    if (nextStatus === "completed") {
      customer.lastShipmentDate = shipment.shipmentDate;
      db.claimedItems = [];
    }
  }

  await writeDatabase(db);

  return {
    ok: true,
    message: `${shipment.customerName} shipment updated to ${nextStatus.replaceAll("_", " ")}.`,
    nextStatus,
  };
}

export async function updateCustomerAccountState(customerId: string, nextState: AccountState) {
  const db = await readDatabase();
  const customer = db.customers.find((entry) => entry.id === customerId);

  if (!customer) {
    return {
      ok: false,
      message: "Customer not found.",
    };
  }

  customer.accountState = nextState;
  db.notifications.unshift(
    createNotification("pending_approval", `${customer.displayName} was updated to ${nextState.replaceAll("_", " ")}.`),
  );
  await writeDatabase(db);

  return {
    ok: true,
    message: `${customer.displayName} is now ${nextState.replaceAll("_", " ")}.`,
    nextStatus: nextState,
  };
}

export async function updateCustomerRoleInDatabase(customerId: string, nextRole: "admin") {
  const db = await readDatabase();
  const customer = db.customers.find((entry) => entry.id === customerId);

  if (!customer) {
    return {
      ok: false,
      message: "Customer not found.",
    };
  }

  customer.role = nextRole;
  customer.accountState = "approved";
  db.notifications.unshift(
    createNotification("pending_approval", `${customer.displayName} was promoted to ${nextRole.replaceAll("_", " ")}.`),
  );
  await writeDatabase(db);

  return {
    ok: true,
    message: `${customer.displayName} is now an ${nextRole.replaceAll("_", " ")}.`,
  };
}

export async function addCustomerNoteToDatabase(customerId: string, note: string) {
  const db = await readDatabase();
  const customer = db.customers.find((entry) => entry.id === customerId);
  const trimmedNote = note.trim();

  if (!customer) {
    return { ok: false, message: "Customer not found." };
  }

  if (!trimmedNote) {
    return { ok: false, message: "Enter a note before saving." };
  }

  db.customerNotes.unshift({
    id: `note-${Date.now()}`,
    customerId,
    note: trimmedNote,
    createdAt: new Date().toISOString(),
  });
  await writeDatabase(db);

  return {
    ok: true,
    message: `Saved an internal note for ${customer.displayName}.`,
  };
}

export async function addManualBalanceItemToDatabase(title: string, quantity: number, unitPrice: number, recordedAt?: string) {
  const db = await readDatabase();
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return { ok: false, message: "Enter an item title." };
  }

  if (quantity < 1 || unitPrice < 0) {
    return { ok: false, message: "Quantity must be at least 1 and price cannot be negative." };
  }

  db.claimedItems.unshift({
    id: `claim-${Date.now()}`,
    productTitle: trimmedTitle,
    quantity,
    unitPrice,
    status: "adjusted",
    createdAt: recordedAt ? `${recordedAt}T12:00:00.000Z` : new Date().toISOString(),
  });
  db.balanceCycle.subtotal += quantity * unitPrice;
  await writeDatabase(db);

  return {
    ok: true,
    message: `${trimmedTitle} was added to the active balance cycle.`,
  };
}

export async function updateClaimedItemInDatabase(claimId: string, quantity: number, unitPrice: number) {
  const db = await readDatabase();
  const item = db.claimedItems.find((entry) => entry.id === claimId);

  if (!item) {
    return { ok: false, message: "Claimed item not found." };
  }

  if (quantity < 1 || unitPrice < 0) {
    return { ok: false, message: "Quantity must be at least 1 and price cannot be negative." };
  }

  const previousTotal = item.quantity * item.unitPrice;
  const nextTotal = quantity * unitPrice;
  item.quantity = quantity;
  item.unitPrice = unitPrice;
  db.balanceCycle.subtotal += nextTotal - previousTotal;
  await writeDatabase(db);

  return {
    ok: true,
    message: `${item.productTitle} was updated.`,
  };
}

export async function removeClaimedItemFromDatabase(claimId: string) {
  const db = await readDatabase();
  const itemIndex = db.claimedItems.findIndex((entry) => entry.id === claimId);

  if (itemIndex === -1) {
    return { ok: false, message: "Claimed item not found." };
  }

  const [removedItem] = db.claimedItems.splice(itemIndex, 1);
  db.balanceCycle.subtotal = Math.max(0, db.balanceCycle.subtotal - removedItem.quantity * removedItem.unitPrice);
  await writeDatabase(db);

  return {
    ok: true,
    message: `${removedItem.productTitle} was removed from the active balance.`,
  };
}

export async function applyBalanceAdjustmentsToDatabase(shippingChange: number, adjustmentChange: number) {
  const db = await readDatabase();
  const nextShipping = db.balanceCycle.shipping + shippingChange;
  const nextAdjustments = db.balanceCycle.adjustments + adjustmentChange;

  if (nextShipping < 0) {
    return { ok: false, message: "Shipping total cannot go below zero." };
  }

  db.balanceCycle.shipping = nextShipping;
  db.balanceCycle.adjustments = nextAdjustments;
  await writeDatabase(db);

  return {
    ok: true,
    message: "Balance charges were updated.",
  };
}

export async function applyPaymentToDatabase(paymentAmount: number, creditAmount: number, recordedAt?: string) {
  const db = await readDatabase();
  const customer = findCurrentCustomer(db);
  const amountDue = calculateBalanceDue(db.balanceCycle);

  if (paymentAmount < 0 || creditAmount < 0) {
    return {
      ok: false,
      message: "Payment and credit amounts must be zero or higher.",
    };
  }

  const balanceAfterCredit = Math.max(amountDue - creditAmount, 0);
  const paymentBreakdown = getPaymentBreakdown(balanceAfterCredit, paymentAmount);
  const preview = applyPaymentToBalance(amountDue, paymentAmount, creditAmount);
  const paymentDate = recordedAt?.trim() || new Date().toISOString().slice(0, 10);

  db.balanceCycle.paymentsApplied += paymentBreakdown.appliedAmount;
  db.balanceCycle.creditsApplied += creditAmount;
  db.paymentDefaults = { paymentAmount, creditAmount };
  if (paymentAmount > 0) {
    db.paymentHistory.unshift({
      id: `payment-${Date.now()}`,
      customerId: customer.id,
      amount: paymentAmount,
      appliedAmount: paymentBreakdown.appliedAmount,
      overpaymentAmount: paymentBreakdown.overpaymentAmount,
      cycleStatus: "active",
      createdAt: paymentDate,
      notes: "Admin-applied payment",
    });
  }
  customer.creditBalance += paymentBreakdown.overpaymentAmount;

  await writeDatabase(db);

  return {
    ok: true,
    message: "Payment applied to the active balance cycle.",
    remainingBalance: Math.max(preview.remaining, 0),
    overpayment: paymentBreakdown.overpaymentAmount,
  };
}

export async function updatePaymentInDatabase(paymentId: string, paymentAmount: number, recordedAt?: string) {
  const db = await readDatabase();
  const payment = db.paymentHistory.find((entry) => entry.id === paymentId);
  const customer = findCurrentCustomer(db);

  if (!payment) {
    return { ok: false, message: "Payment not found." };
  }
  if ((payment.cycleStatus ?? "active") !== "active") {
    return { ok: false, message: "Only payments on an active balance cycle can be edited right now." };
  }
  if (paymentAmount < 0) {
    return { ok: false, message: "Payment amount must be zero or higher." };
  }

  const previousAppliedAmount = Number(payment.appliedAmount ?? payment.amount ?? 0);
  const previousOverpaymentAmount = Number(payment.overpaymentAmount ?? 0);
  if (previousOverpaymentAmount > 0 && customer.creditBalance < previousOverpaymentAmount) {
    return { ok: false, message: "This payment's overpayment credit has already been used, so it can't be edited safely." };
  }

  const otherAppliedPayments = Math.max(0, db.balanceCycle.paymentsApplied - previousAppliedAmount);
  const balanceDueBeforeThisPayment = Math.max(
    db.balanceCycle.subtotal + db.balanceCycle.shipping + db.balanceCycle.adjustments - otherAppliedPayments - db.balanceCycle.creditsApplied,
    0,
  );
  const paymentBreakdown = getPaymentBreakdown(balanceDueBeforeThisPayment, paymentAmount);
  const paymentDate = recordedAt?.trim() || payment.createdAt;

  db.balanceCycle.paymentsApplied = otherAppliedPayments + paymentBreakdown.appliedAmount;
  customer.creditBalance = Math.max(customer.creditBalance - previousOverpaymentAmount, 0) + paymentBreakdown.overpaymentAmount;
  payment.amount = paymentAmount;
  payment.appliedAmount = paymentBreakdown.appliedAmount;
  payment.overpaymentAmount = paymentBreakdown.overpaymentAmount;
  payment.createdAt = paymentDate;

  await writeDatabase(db);

  return {
    ok: true,
    message: "Payment updated.",
    remainingBalance: Math.max(balanceDueBeforeThisPayment - paymentAmount, 0),
    overpayment: paymentBreakdown.overpaymentAmount,
  };
}

export async function markNotificationReadInDatabase(notificationId: string) {
  const db = await readDatabase();
  const notification = db.notifications.find((entry) => entry.id === notificationId);

  if (!notification) {
    return { ok: false, message: "Notification not found." };
  }

  notification.readAt = new Date().toISOString();
  await writeDatabase(db);

  return {
    ok: true,
    message: "Notification dismissed.",
  };
}

export async function recordAdminAuditEntry(input: {
  actionType: string;
  entityType: string;
  entityId?: string | null;
  targetCustomerId?: string | null;
  summary: string;
  actorId?: string;
  actorName?: string;
  actorRole?: "customer" | "admin" | "master_admin";
}) {
  const db = await readDatabase();
  db.adminAuditLog.unshift({
    id: `audit-${Date.now()}`,
    actorId: input.actorId ?? "admin-demo",
    actorName: input.actorName ?? "Admin",
    actorRole: input.actorRole ?? "admin",
    actionType: input.actionType,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    targetCustomerId: input.targetCustomerId ?? null,
    summary: input.summary,
    createdAt: new Date().toISOString(),
  });
  await writeDatabase(db);
  return { ok: true as const };
}
