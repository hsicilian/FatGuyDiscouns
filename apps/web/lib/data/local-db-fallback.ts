import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  applyPaymentToBalance,
  calculateBalanceDue,
  canDeleteArchivedProduct,
  canRequestShipment,
  deriveProductStatus,
  getScheduledDueDateForDate,
  isBalanceOverdue,
  nextShipmentStatus,
  shouldArchiveBalance,
  validateClaimAttempt,
} from "@fatguydiscounts/core";
import { platformSummary } from "@fatguydiscounts/db";
import type {
  AccountState,
  AdminNotification,
  ArchivedInvoice,
  BalanceCycleSummary,
  ClaimedItem,
  CustomerNote,
  CustomerSummary,
  FinancialSummary,
  Product,
  RestockRequestRecord,
  ShowEvent,
  ShipmentRecord,
  ShipmentStatus,
} from "@fatguydiscounts/types";

export interface LocalDatabase {
  activeCustomerId: string;
  products: Product[];
  customers: CustomerSummary[];
  balanceCycle: BalanceCycleSummary;
  claimedItems: ClaimedItem[];
  archivedInvoices: ArchivedInvoice[];
  shipmentRecords: ShipmentRecord[];
  customerNotes: CustomerNote[];
  notifications: AdminNotification[];
  events: ShowEvent[];
  paymentDefaults: {
    paymentAmount: number;
    creditAmount: number;
  };
}

const dbPath = join(process.cwd(), "apps", "web", "data", "local-db.json");

function serialize(db: LocalDatabase) {
  return `${JSON.stringify(db, null, 2)}\n`;
}

function createInitialDatabase(): LocalDatabase {
  return {
    activeCustomerId: "cust-001",
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
        price: isOnSale && salePrice != null ? salePrice : originalPrice,
      };
    }),
    customers: db.customers ?? fallback.customers,
    balanceCycle: db.balanceCycle ?? fallback.balanceCycle,
    claimedItems: db.claimedItems ?? fallback.claimedItems,
    archivedInvoices: db.archivedInvoices ?? fallback.archivedInvoices,
    shipmentRecords: db.shipmentRecords ?? fallback.shipmentRecords,
    customerNotes: db.customerNotes ?? fallback.customerNotes,
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

export async function listProducts() {
  const db = await readDatabase();
  return db.products;
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

export async function listShipmentRecords() {
  const db = await readDatabase();
  return db.shipmentRecords;
}

export async function listCustomerNotes(customerId?: string) {
  const db = await readDatabase();
  return customerId ? db.customerNotes.filter((entry) => entry.customerId === customerId) : db.customerNotes;
}

export async function listRestockRequests(customerId?: string) {
  const db = await readDatabase();
  const requests: RestockRequestRecord[] = db.notifications
    .filter((notification) => notification.type === "restock_request")
    .map((notification) => ({
      id: notification.id,
      customerId: customerId ?? null,
      productTitle: notification.label.replace("Restock request received for ", "").replace(".", ""),
      status: "open",
      createdAt: notification.createdAt,
      email: null,
    }));

  return customerId ? requests.filter((request) => request.customerId === customerId) : requests;
}

export async function listNotifications(options?: { includeRead?: boolean }) {
  const db = await readDatabase();
  return options?.includeRead ? db.notifications : db.notifications.filter((entry) => !entry.readAt);
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

  return {
    totalRunningBalance: amountDue + 118 + 76,
    unpaidTotal: amountDue + 118 + 76,
    paymentsThisCycle: db.balanceCycle.paymentsApplied,
    customerBalances: [
      {
        customer: currentCustomer.displayName,
        amount: amountDue,
        overdue: isBalanceOverdue(db.balanceCycle, new Date().toISOString().slice(0, 10)),
      },
      {
        customer: "Casey Morgan",
        amount: 118,
        overdue: true,
      },
      {
        customer: "Taylor West",
        amount: 76,
        overdue: false,
      },
    ],
  };
}

export async function createEventInDatabase(input: {
  title: string;
  startsAtLocal: string;
  description: string;
  externalLink: string;
  platform: string;
  timeZone: string;
}) {
  const db = await readDatabase();
  const title = input.title.trim();
  if (!title) {
    return { ok: false, message: "Event title is required." };
  }

  db.events = [
    {
      id: `event-${Date.now()}`,
      title,
      startsAt: new Date(input.startsAtLocal).toISOString(),
      description: input.description.trim(),
      externalLink: input.externalLink.trim(),
      platform: input.platform.trim() || undefined,
    },
    ...db.events,
  ].sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  await writeDatabase(db);
  return { ok: true, message: `${title} was added to the events calendar.` };
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

  const nextQuantity = product.quantity + quantityChange;
  if (nextQuantity < 0) {
    return { ok: false, message: "Inventory cannot go below zero." };
  }

  product.quantity = nextQuantity;
  product.status = deriveProductStatus(product.quantity, product.status);

  if (product.quantity === 1) {
    db.notifications.unshift(createNotification("low_stock", `${product.title} reached low stock.`));
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
  if (!canDeleteArchivedProduct(product.archivedAt)) {
    return { ok: false, message: "Archived items must stay archived for 30 days before deletion." };
  }

  const hasClaims = db.claimedItems.some((entry) => entry.productTitle === product.title);
  if (hasClaims) {
    return { ok: false, message: "This item has claim history and cannot be permanently deleted." };
  }

  db.products.splice(productIndex, 1);
  await writeDatabase(db);
  return { ok: true, message: `${product.title} was permanently deleted.` };
}

export async function createInventoryItemInDatabase(input: {
  title: string;
  description: string;
  price: number;
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
  const quantity = Number(input.quantity);
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

  if (!Number.isInteger(quantity) || quantity < 0) {
    return { ok: false, message: "Starting quantity must be zero or higher." };
  }

  if (images.length < 4) {
    return { ok: false, message: "Please upload at least 4 photos for each item." };
  }

  db.products.unshift({
    id: `prod-${Date.now()}`,
    title,
    description,
    price,
    originalPrice: price,
    salePrice: null,
    salePercentage: null,
    saleEndsAt: null,
    isOnSale: false,
    archivedAt: null,
    category,
    quantity,
    status: deriveProductStatus(quantity, "active"),
  });

  await writeDatabase(db);

  return {
    ok: true,
    message: `${title} was added with ${images.length} photo${images.length === 1 ? "" : "s"} and ${quantity} item${quantity === 1 ? "" : "s"} on hand.`,
  };
}

export async function submitRestockRequestToDatabase(productId: string) {
  const db = await readDatabase();
  const product = db.products.find((entry) => entry.id === productId);

  if (!product) {
    return { ok: false, message: "Product not found." };
  }

  const label = `Restock request received for ${product.title}.`;
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
    customerName: customer.displayName,
    status: nextStatus,
    requestedAt: new Date().toISOString(),
    trackingNumber: null,
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

export async function updateShipmentInDatabase(
  shipmentId: string,
  nextStatus: ShipmentStatus,
  trackingNumber: string,
) {
  const db = await readDatabase();
  const shipment = db.shipmentRecords.find((entry) => entry.id === shipmentId);

  if (!shipment) {
    return { ok: false, message: "Shipment record not found." };
  }

  shipment.status = nextStatus;
  shipment.trackingNumber = trackingNumber.trim() || null;
  shipment.shipmentDate = nextStatus === "completed" ? new Date().toISOString().slice(0, 10) : shipment.shipmentDate;

  const customer = findCustomerByName(db, shipment.customerName);
  if (customer) {
    customer.shipmentStatus = nextStatus;
    if (nextStatus === "completed") {
      customer.lastShipmentDate = shipment.shipmentDate;
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

export async function addManualBalanceItemToDatabase(title: string, quantity: number, unitPrice: number) {
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

export async function applyPaymentToDatabase(paymentAmount: number, creditAmount: number) {
  const db = await readDatabase();
  const customer = findCurrentCustomer(db);
  const amountDue = calculateBalanceDue(db.balanceCycle);

  if (paymentAmount < 0 || creditAmount < 0) {
    return {
      ok: false,
      message: "Payment and credit amounts must be zero or higher.",
    };
  }

  const preview = applyPaymentToBalance(amountDue, paymentAmount, creditAmount);

  db.balanceCycle.paymentsApplied += paymentAmount;
  db.balanceCycle.creditsApplied += creditAmount;
  db.paymentDefaults = { paymentAmount, creditAmount };

  if (shouldArchiveBalance(preview.remaining)) {
    const cycleTotal = db.balanceCycle.subtotal + db.balanceCycle.shipping + db.balanceCycle.adjustments;

    db.archivedInvoices.unshift({
      id: `inv-${Date.now()}`,
      cycleLabel: formatCycleLabel(new Date()),
      paidAt: new Date().toISOString().slice(0, 10),
      total: cycleTotal,
      paymentTotal: db.balanceCycle.paymentsApplied,
      creditApplied: db.balanceCycle.creditsApplied,
    });

    customer.creditBalance += preview.overpayment;
    db.balanceCycle = {
      id: `cycle-${Date.now()}`,
      status: "active",
      dueDate: nextDueDateFromToday(),
      subtotal: 0,
      shipping: 0,
      adjustments: 0,
      paymentsApplied: 0,
      creditsApplied: 0,
    };
    db.claimedItems = [];
  }

  await writeDatabase(db);

  return {
    ok: true,
    message: shouldArchiveBalance(preview.remaining)
      ? "Payment applied and the balance cycle was archived."
      : "Payment applied to the active balance cycle.",
    remainingBalance: Math.max(preview.remaining, 0),
    overpayment: preview.overpayment,
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
