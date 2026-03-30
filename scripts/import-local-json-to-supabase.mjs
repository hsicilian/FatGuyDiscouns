import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const dbPath = join(root, "apps", "web", "data", "local-db.json");
const authPath = join(root, "apps", "web", "data", "local-auth.json");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function splitAddress(address) {
  const [line1 = "Address pending confirmation", city = "Pending", regionPostal = "Pending"] = String(address ?? "").split(",").map((part) => part.trim());
  const regionPostalParts = regionPostal.split(/\s+/);
  const postal_code = regionPostalParts.pop() ?? "Pending";
  const region = regionPostalParts.join(" ") || "Pending";
  return {
    line1,
    city,
    region,
    postal_code,
    country: "US",
    is_default: true,
  };
}

async function loadJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function listExistingUsers(admin) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw error;
  }
  return new Map((data.users ?? []).map((user) => [user.email?.toLowerCase(), user]));
}

async function upsertUser(admin, existingUsers, account, customer) {
  const email = (account?.email ?? customer?.email ?? "").toLowerCase();
  if (!email) {
    throw new Error("Missing email during user import.");
  }

  const existing = existingUsers.get(email);
  if (existing) {
    return existing;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: account?.password ?? "ChangeMe123!",
    email_confirm: true,
    user_metadata: {
      display_name: customer?.displayName ?? account?.displayName ?? email,
      timezone: customer?.timezone ?? "America/New_York",
      address: customer?.address ?? "Address pending confirmation",
    },
  });

  if (error || !data.user) {
    throw error ?? new Error(`Unable to create auth user for ${email}`);
  }

  existingUsers.set(email, data.user);
  return data.user;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [localDb, localAuth] = await Promise.all([loadJson(dbPath), loadJson(authPath)]);
  const authAccounts = localAuth.accounts ?? [];
  const customers = localDb.customers ?? [];
  const existingUsers = await listExistingUsers(admin);
  const customerIdMap = new Map();
  const productIdMap = new Map();
  const categoryIdMap = new Map();

  for (const customer of customers) {
    const account = authAccounts.find((entry) => entry.customerId === customer.id || entry.email?.toLowerCase() === customer.email?.toLowerCase());
    const user = await upsertUser(admin, existingUsers, account, customer);
    customerIdMap.set(customer.id, user.id);

    await admin.from("user_roles").upsert({
      user_id: user.id,
      role: customer.role,
      account_state: customer.accountState,
    }, { onConflict: "user_id" });

    await admin.from("customer_profiles").upsert({
      user_id: user.id,
      display_name: customer.displayName,
      timezone: customer.timezone,
      credit_balance: customer.creditBalance,
      last_shipment_date: customer.lastShipmentDate,
    }, { onConflict: "user_id" });

    const addressPayload = splitAddress(customer.address);
    const { data: addressRow } = await admin.from("addresses").insert({ user_id: user.id, ...addressPayload }).select("id").single();
    if (addressRow?.id) {
      await admin.from("customer_profiles").update({ default_address_id: addressRow.id }).eq("user_id", user.id);
    }
  }

  for (const account of authAccounts.filter((entry) => !entry.customerId)) {
    const user = await upsertUser(admin, existingUsers, account, null);
    await admin.from("user_roles").upsert({
      user_id: user.id,
      role: account.role,
      account_state: account.accountState,
    }, { onConflict: "user_id" });
  }

  for (const product of localDb.products ?? []) {
    let categoryId = categoryIdMap.get(product.category);
    if (!categoryId) {
      const { data: category } = await admin.from("categories").upsert({
        name: product.category,
        slug: slugify(product.category),
      }, { onConflict: "slug" }).select("id").single();
      categoryId = category?.id;
      categoryIdMap.set(product.category, categoryId);
    }

    const { data: insertedProduct } = await admin.from("products").insert({
      title: product.title,
      description: product.description,
      price: product.price,
      category_id: categoryId,
      inventory_quantity: product.quantity,
      status: product.status,
      sku: product.sku ?? null,
      location: product.location ?? null,
    }).select("id").single();

    if (insertedProduct?.id) {
      productIdMap.set(product.id, insertedProduct.id);
    }
  }

  const activeCustomerId = customerIdMap.get(localDb.activeCustomerId);
  let activeCycleId = null;
  if (activeCustomerId) {
    const { data: cycle } = await admin.from("balance_cycles").insert({
      customer_id: activeCustomerId,
      status: localDb.balanceCycle.status,
      due_date: localDb.balanceCycle.dueDate,
    }).select("id").single();
    activeCycleId = cycle?.id ?? null;

    if (activeCycleId) {
      for (const item of localDb.claimedItems ?? []) {
        const matchedProduct = (localDb.products ?? []).find((product) => product.title === item.productTitle);
        await admin.from("balance_line_items").insert({
          cycle_id: activeCycleId,
          product_id: matchedProduct ? productIdMap.get(matchedProduct.id) : null,
          item_type: matchedProduct ? "claim" : "manual_adjustment",
          description: item.productTitle,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          status: item.status,
          created_by: activeCustomerId,
        });
      }

      if ((localDb.balanceCycle.shipping ?? 0) > 0) {
        await admin.from("balance_line_items").insert({
          cycle_id: activeCycleId,
          item_type: "manual_adjustment",
          description: "Shipping charge",
          quantity: 1,
          unit_price: localDb.balanceCycle.shipping,
          status: "adjusted",
          created_by: activeCustomerId,
        });
      }

      if ((localDb.balanceCycle.adjustments ?? 0) !== 0) {
        await admin.from("balance_line_items").insert({
          cycle_id: activeCycleId,
          item_type: "manual_adjustment",
          description: "Admin adjustment",
          quantity: 1,
          unit_price: localDb.balanceCycle.adjustments,
          status: "adjusted",
          created_by: activeCustomerId,
        });
      }

      if ((localDb.balanceCycle.paymentsApplied ?? 0) > 0) {
        await admin.from("payments").insert({
          cycle_id: activeCycleId,
          amount: localDb.balanceCycle.paymentsApplied,
          notes: "Imported from local beta data",
        });
      }
    }

    for (const invoice of localDb.archivedInvoices ?? []) {
      const { data: archivedCycle } = await admin.from("balance_cycles").insert({
        customer_id: activeCustomerId,
        status: "archived",
        due_date: invoice.paidAt,
      }).select("id").single();

      if (archivedCycle?.id) {
        await admin.from("archived_invoices").insert({
          cycle_id: archivedCycle.id,
          customer_id: activeCustomerId,
          cycle_label: invoice.cycleLabel,
          paid_at: invoice.paidAt,
          total: invoice.total,
          payment_total: invoice.paymentTotal,
          credit_applied: invoice.creditApplied,
        });
      }
    }
  }

  for (const note of localDb.customerNotes ?? []) {
    const mappedCustomerId = customerIdMap.get(note.customerId);
    if (!mappedCustomerId) continue;
    await admin.from("customer_notes").insert({
      customer_id: mappedCustomerId,
      body: note.note,
      created_at: note.createdAt,
    });
  }

  for (const shipment of localDb.shipmentRecords ?? []) {
    const matchedCustomer = customers.find((customer) => customer.displayName === shipment.customerName);
    const mappedCustomerId = matchedCustomer ? customerIdMap.get(matchedCustomer.id) : null;
    if (!mappedCustomerId) continue;

    await admin.from("shipments").insert({
      cycle_id: matchedCustomer?.id === localDb.activeCustomerId ? activeCycleId : null,
      customer_id: mappedCustomerId,
      status: shipment.status,
      requested_at: shipment.requestedAt,
      tracking_number: shipment.trackingNumber,
      shipment_date: shipment.shipmentDate,
      completed_at: shipment.status === "completed" ? shipment.shipmentDate : null,
      address_confirmed: true,
    });
  }

  for (const notification of localDb.notifications ?? []) {
    await admin.from("notifications").insert({
      type: notification.type,
      payload: { label: notification.label },
      created_at: notification.createdAt,
    });
  }

  for (const event of localDb.events ?? []) {
    await admin.from("events").insert({
      title: event.title,
      starts_at: event.startsAt,
      description: event.description,
      external_link: event.externalLink,
      platform: event.platform ?? null,
    });
  }

  console.log("Imported local beta data into Supabase.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
