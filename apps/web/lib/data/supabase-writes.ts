import "server-only";

import { applyPaymentToBalance, canRequestShipment, deriveProductStatus, isBalanceOverdue, nextShipmentStatus, validateClaimAttempt } from "@fatguydiscounts/core";
import type { AccountState, NotificationType, ShipmentStatus } from "@fatguydiscounts/types";
import {
  dueDateForReferenceDate,
  ensureActiveCycle,
  formatCycleLabel,
  getAdminClient,
  mapBalanceCycle,
  getCurrentActor,
  getCustomerSummaryByUserId,
  listActiveCycleContexts,
  pickPrimaryCycleContext,
  getTargetCycleContext,
  getCycleSubtotal,
  siteToday,
} from "./supabase-helpers";
import { getCurrentCustomerSupabase, listProductsSupabase } from "./supabase-reads";
import { getProductImagesBucket, getSiteUrl } from "../supabase";
import { buildWeeklyRecurringLocalDateTimes, zonedLocalDateTimeToIso } from "../events";
import { getProductPath } from "../products";
import { sendAdminEmailNotification } from "../admin-email";

const MAX_IMAGE_COUNT = 6;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function slugifyFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function normalizeRecordedAt(recordedAt?: string) {
  const trimmed = recordedAt?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  return {
    date: trimmed,
    timestamp: `${trimmed}T12:00:00.000Z`,
  };
}

function getBalanceDueAmount(summary: { subtotal: number; shipping: number; adjustments: number; paymentsApplied: number; creditsApplied: number }) {
  return summary.subtotal + summary.shipping + summary.adjustments - summary.paymentsApplied - summary.creditsApplied;
}

function getPaymentBreakdown(balanceDue: number, paymentAmount: number) {
  const appliedAmount = Math.min(paymentAmount, Math.max(balanceDue, 0));
  const overpaymentAmount = Math.max(paymentAmount - appliedAmount, 0);
  return { appliedAmount, overpaymentAmount };
}

async function listOpenCycleContextsForPayment(customerId: string, recordedDueDate?: string) {
  const admin = await getAdminClient();
  const { data: cycles, error } = await admin
    .from("balance_cycles")
    .select("*")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .order("due_date", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  let cycleRows = [...(cycles ?? [])];
  if (cycleRows.length === 0) {
    cycleRows = [await ensureActiveCycle(customerId, recordedDueDate || dueDateForReferenceDate())];
  }

  const customer = await getCustomerSummaryByUserId(customerId, { admin: true });
  const contexts = await Promise.all(cycleRows.map(async (cycle) => {
    const subtotal = await getCycleSubtotal(cycle.id, { admin: true });
    const summary = mapBalanceCycle(cycle as Record<string, any>, subtotal, { id: customer.id, displayName: customer.displayName });
    const due = getBalanceDueAmount(summary);
    return {
      cycle,
      summary,
      due,
      overdue: isBalanceOverdue(summary, siteToday()),
    };
  }));

  return contexts
    .filter((context) => context.due > 0)
    .sort((left, right) => {
      if (left.overdue !== right.overdue) {
        return left.overdue ? -1 : 1;
      }
      return String(left.summary.dueDate).localeCompare(String(right.summary.dueDate));
    });
}

async function getAppliedPaymentTotalForCycle(
  admin: Awaited<ReturnType<typeof getAdminClient>>,
  cycleId: string,
) {
  const { data, error } = await admin
    .from("payments")
    .select("applied_amount, amount")
    .eq("cycle_id", cycleId);

  if (error) {
    throw error;
  }

  return (data ?? []).reduce(
    (sum, payment) => sum + Number(payment.applied_amount ?? payment.amount ?? 0),
    0,
  );
}

async function finalizeCycleIfSettled(
  admin: Awaited<ReturnType<typeof getAdminClient>>,
  cycleId: string,
  settledAt = siteToday(),
) {
  const { data: cycle, error: cycleError } = await admin
    .from("balance_cycles")
    .select("id, customer_id, status, due_date, shipping_total, adjustments_total, payments_applied, credits_applied")
    .eq("id", cycleId)
    .single();

  if (cycleError || !cycle) {
    throw cycleError ?? new Error("Balance cycle not found.");
  }

  const subtotal = await getCycleSubtotal(cycleId, { admin: true });
  const paymentsApplied = await getAppliedPaymentTotalForCycle(admin, cycleId);
  const creditsApplied = Number(cycle.credits_applied ?? 0);
  const summary = mapBalanceCycle(cycle as Record<string, any>, subtotal, undefined, {
    paymentsApplied,
    creditsApplied,
  });
  const remainingDue = getBalanceDueAmount(summary);
  const updatedAt = new Date().toISOString();

  if (remainingDue > 0) {
    const { error: syncError } = await admin
      .from("balance_cycles")
      .update({
        payments_applied: paymentsApplied,
        updated_at: updatedAt,
      })
      .eq("id", cycleId);

    if (syncError) {
      throw syncError;
    }

    return { archived: false as const, remainingDue };
  }

  const cycleDueDate = String(cycle.due_date ?? settledAt).slice(0, 10);
  const cycleLabel = formatCycleLabel(new Date(`${cycleDueDate}T12:00:00.000Z`));
  const total = Number(summary.subtotal ?? 0) + Number(summary.shipping ?? 0) + Number(summary.adjustments ?? 0);

  const { error: cycleUpdateError } = await admin
    .from("balance_cycles")
    .update({
      status: "archived",
      payments_applied: paymentsApplied,
      updated_at: updatedAt,
    })
    .eq("id", cycleId);

  if (cycleUpdateError) {
    throw cycleUpdateError;
  }

  const { error: invoiceError } = await admin
    .from("archived_invoices")
    .upsert({
      cycle_id: cycleId,
      customer_id: cycle.customer_id,
      cycle_label: cycleLabel,
      paid_at: settledAt,
      total,
      shipping_total: Number(summary.shipping ?? 0),
      payment_total: paymentsApplied,
      credit_applied: creditsApplied,
      status: "archived",
      updated_at: updatedAt,
    }, { onConflict: "cycle_id" });

  if (invoiceError) {
    throw invoiceError;
  }

  return { archived: true as const, remainingDue: 0 };
}

function parseShippingInvoiceAmount(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return 0;
  }

  const normalized = trimmed.replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  return Number(normalized);
}

async function adjustCycleShippingTotalSupabase(
  admin: Awaited<ReturnType<typeof getAdminClient>>,
  cycleId: string,
  delta: number,
) {
  if (!delta) {
    return { ok: true as const };
  }

  const { data: cycle, error: cycleError } = await admin
    .from("balance_cycles")
    .select("id, shipping_total")
    .eq("id", cycleId)
    .single();

  if (cycleError || !cycle) {
    return { ok: false as const, message: cycleError?.message ?? "Balance cycle not found for shipment." };
  }

  const nextShippingTotal = Math.max(0, Number(cycle.shipping_total ?? 0) + delta);
  const cycleUpdate = await admin
    .from("balance_cycles")
    .update({ shipping_total: nextShippingTotal, updated_at: new Date().toISOString() })
    .eq("id", cycleId);

  if (cycleUpdate.error) {
    return { ok: false as const, message: cycleUpdate.error.message };
  }

  return { ok: true as const };
}

async function createAdminNotificationSupabase(
  admin: Awaited<ReturnType<typeof getAdminClient>>,
  input: {
    type: NotificationType;
    customerId?: string | null;
    productId?: string | null;
    label: string;
    payload?: Record<string, unknown>;
    emailSubject?: string;
    emailText?: string;
  },
) {
  const { error } = await admin.from("notifications").insert({
    type: input.type,
    customer_id: input.customerId ?? null,
    product_id: input.productId ?? null,
    payload: {
      label: input.label,
      ...(input.payload ?? {}),
    },
  });

  if (error) {
    throw error;
  }

  if (input.emailSubject && input.emailText) {
    try {
      await sendAdminEmailNotification({
        subject: input.emailSubject,
        text: input.emailText,
      });
    } catch {
      // Keep the in-app notification even if outbound email fails.
    }
  }
}

async function saveCustomerProfileAddressSupabase(userId: string, input: {
  street: string;
  city: string;
  region: string;
  postalCode: string;
  timezone: string;
}) {
  const street = input.street.trim();
  const city = input.city.trim();
  const region = input.region.trim();
  const postalCode = input.postalCode.trim();
  const timezone = input.timezone.trim();
  if (!street || !city || !region || !postalCode) return { ok: false as const, message: "Street, city, state, and zip code are all required." };
  if (!timezone) return { ok: false as const, message: "Timezone is required." };

  const admin = await getAdminClient();
  const existingAddresses = await admin
    .from("addresses")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (existingAddresses.error) {
    return { ok: false as const, message: existingAddresses.error.message };
  }

  const addressIds = (existingAddresses.data ?? []).map((row) => row.id);
  let addressId = addressIds[0] ?? null;

  const profileUpsert = await admin
    .from("customer_profiles")
    .upsert({
      user_id: userId,
      timezone,
      default_address_id: addressId,
    }, { onConflict: "user_id" });

  if (profileUpsert.error) return { ok: false as const, message: profileUpsert.error.message };

  if (addressId) {
    if (addressIds.length > 1) {
      const clearDefaults = await admin
        .from("addresses")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .in("id", addressIds.slice(1));

      if (clearDefaults.error) return { ok: false as const, message: clearDefaults.error.message };
    }

    const updateAddress = await admin
      .from("addresses")
      .update({
        line1: street,
        city,
        region,
        postal_code: postalCode,
        country: "US",
        is_default: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", addressId)
      .eq("user_id", userId);

    if (updateAddress.error) return { ok: false as const, message: updateAddress.error.message };
  } else {
    const insertAddress = await admin
      .from("addresses")
      .insert({ user_id: userId, line1: street, city, region, postal_code: postalCode, country: "US", is_default: true })
      .select("id")
      .single();

    if (insertAddress.error || !insertAddress.data) {
      return { ok: false as const, message: insertAddress.error?.message ?? "Could not save address." };
    }

    addressId = insertAddress.data.id;
  }

  const profileUpdate = await admin
    .from("customer_profiles")
    .upsert({
      user_id: userId,
      timezone,
      default_address_id: addressId,
    }, { onConflict: "user_id" });
  if (profileUpdate.error) return { ok: false as const, message: profileUpdate.error.message };

  return { ok: true as const, message: "Profile details updated." };
}

async function notifyRestockRequestCustomers(
  admin: Awaited<ReturnType<typeof getAdminClient>>,
  product: { id: string; title: string },
) {
  const { data: requests, error } = await admin
    .from("restock_requests")
    .select("id, customer_id")
    .eq("product_id", product.id)
    .eq("status", "open")
    .not("customer_id", "is", null);

  if (error) {
    throw error;
  }

  const customerIds = [...new Set((requests ?? []).map((request) => request.customer_id).filter((value): value is string => typeof value === "string" && value.length > 0))];
  if (customerIds.length === 0) {
    return;
  }

  const productUrl = `${getSiteUrl().replace(/\/$/, "")}${getProductPath({ id: product.id, title: product.title })}`;
  const customerMessages = await Promise.all(customerIds.map(async (customerId) => {
    const customer = await getCustomerSummaryByUserId(customerId, { admin: true });
    return {
      customer_id: customerId,
      body: `Hi ${customer.displayName}, you asked if I could get more of ${product.title}. It's now back in stock here: ${productUrl}`,
      sender_role: "admin" as const,
    };
  }));

  const messageInsert = await admin.from("customer_messages").insert(customerMessages);
  if (messageInsert.error) {
    throw messageInsert.error;
  }

  await admin
    .from("restock_requests")
    .update({ status: "fulfilled" })
    .in("id", (requests ?? []).map((request) => request.id));
}

export async function submitClaimToDatabaseSupabase(productId: string, requestedQuantity: number) {
  const customer = await getCurrentCustomerSupabase();
  const products = await listProductsSupabase();
  const product = products.find((entry) => entry.id === productId);
  if (!product) return { ok: false, message: "Product not found." };

  const preview = validateClaimAttempt({
    role: customer.role,
    accountState: customer.accountState,
    availableQuantity: product.quantity,
    requestedQuantity,
  });
  if (!preview.ok) return preview;

  const admin = await getAdminClient();
  const { error } = await admin.rpc("admin_claim_product", {
    p_customer_id: customer.id,
    p_product_id: productId,
    p_quantity: requestedQuantity,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `${product.title} has been added to the active running balance.` };
}

export async function adjustInventoryInDatabaseSupabase(productId: string, quantityChange: number) {
  const admin = await getAdminClient();
  const { data: product, error } = await admin.from("products").select("id, title, inventory_quantity").eq("id", productId).single();
  if (error || !product) return { ok: false, message: "Product not found." };

  const previousQuantity = Number(product.inventory_quantity ?? 0);
  const nextQuantity = Number(product.inventory_quantity ?? 0) + quantityChange;
  if (nextQuantity < 0) return { ok: false, message: "Inventory cannot go below zero." };

  const updateResult = await admin.from("products").update({ inventory_quantity: nextQuantity, updated_at: new Date().toISOString() }).eq("id", productId);
  if (updateResult.error) return { ok: false, message: updateResult.error.message };

  if (nextQuantity === 1) {
    await createAdminNotificationSupabase(admin, {
      type: "low_stock",
      productId,
      label: `${product.title} reached low stock.`,
      emailSubject: "Low stock alert",
      emailText: `${product.title} reached low stock on Fat Guy Discounts.`,
    });
  }

  if (previousQuantity === 0 && nextQuantity > 0) {
    await notifyRestockRequestCustomers(admin, { id: product.id, title: product.title });
  }

  return { ok: true, message: `${product.title} inventory updated to ${nextQuantity}.` };
}

export async function updateProductSaleInDatabaseSupabase(productId: string, salePercentage: number, saleEndsAt: string) {
  const admin = await getAdminClient();
  const { data: product, error } = await admin.from("products").select("id, title").eq("id", productId).single();
  if (error || !product) return { ok: false, message: "Product not found." };

  if (!Number.isFinite(salePercentage) || salePercentage <= 0 || salePercentage >= 100) {
    return { ok: false, message: "Sale percentage must be between 1 and 99." };
  }

  if (!saleEndsAt) {
    return { ok: false, message: "Sale end date is required." };
  }

  const endsAtIso = `${saleEndsAt}T23:59:59.000Z`;
  const updateResult = await admin
    .from("products")
    .update({
      sale_percentage: salePercentage,
      sale_ends_at: endsAtIso,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateResult.error) return { ok: false, message: updateResult.error.message };
  return { ok: true, message: `${product.title} is now ${salePercentage}% off through ${saleEndsAt}.` };
}

export async function clearProductSaleInDatabaseSupabase(productId: string) {
  const admin = await getAdminClient();
  const { data: product, error } = await admin.from("products").select("id, title").eq("id", productId).single();
  if (error || !product) return { ok: false, message: "Product not found." };

  const updateResult = await admin
    .from("products")
    .update({
      sale_percentage: null,
      sale_ends_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateResult.error) return { ok: false, message: updateResult.error.message };
  return { ok: true, message: `${product.title} sale pricing was cleared.` };
}

export async function updateProductSalesBulkInDatabaseSupabase(
  productIds: string[],
  salePercentage: number,
  saleEndsAt: string,
) {
  const uniqueProductIds = [...new Set(productIds.map((value) => value.trim()).filter(Boolean))];

  if (uniqueProductIds.length === 0) {
    return { ok: false, message: "Select at least one inventory item for the sale." };
  }

  if (!Number.isFinite(salePercentage) || salePercentage <= 0 || salePercentage >= 100) {
    return { ok: false, message: "Sale percentage must be between 1 and 99." };
  }

  if (!saleEndsAt) {
    return { ok: false, message: "Sale end date is required." };
  }

  const admin = await getAdminClient();
  const { data: products, error: productsError } = await admin
    .from("products")
    .select("id, title")
    .in("id", uniqueProductIds);

  if (productsError) {
    return { ok: false, message: productsError.message };
  }

  if ((products ?? []).length === 0) {
    return { ok: false, message: "No matching inventory items were found for the selected sale." };
  }

  const endsAtIso = `${saleEndsAt}T23:59:59.000Z`;
  const updateResult = await admin
    .from("products")
    .update({
      sale_percentage: salePercentage,
      sale_ends_at: endsAtIso,
      updated_at: new Date().toISOString(),
    })
    .in("id", uniqueProductIds);

  if (updateResult.error) {
    return { ok: false, message: updateResult.error.message };
  }

  return {
    ok: true,
    message: `Started a ${salePercentage}% sale on ${(products ?? []).length} item${(products ?? []).length === 1 ? "" : "s"} through ${saleEndsAt}.`,
  };
}

export async function updateProductSaleByTargetPriceInDatabaseSupabase(
  productId: string,
  salePrice: number,
  saleEndsAt: string,
) {
  const admin = await getAdminClient();
  const { data: product, error } = await admin
    .from("products")
    .select("id, title, price")
    .eq("id", productId)
    .single();

  if (error || !product) {
    return { ok: false, message: error?.message ?? "Product not found." };
  }

  const originalPrice = Number(product.price ?? 0);
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    return { ok: false, message: "Sale price must be above zero." };
  }
  if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
    return { ok: false, message: "This item needs a normal price before you can set a sale price." };
  }
  if (salePrice >= originalPrice) {
    return { ok: false, message: "Sale price must be lower than the current price." };
  }

  const salePercentage = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  return updateProductSaleInDatabaseSupabase(productId, salePercentage, saleEndsAt);
}

export async function updateProductSalesBulkByTargetPriceInDatabaseSupabase(
  productIds: string[],
  salePrice: number,
  saleEndsAt: string,
) {
  const uniqueProductIds = [...new Set(productIds.map((value) => value.trim()).filter(Boolean))];

  if (uniqueProductIds.length === 0) {
    return { ok: false, message: "Select at least one inventory item for the sale." };
  }

  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    return { ok: false, message: "Sale price must be above zero." };
  }

  if (!saleEndsAt) {
    return { ok: false, message: "Sale end date is required." };
  }

  const admin = await getAdminClient();
  const { data: products, error } = await admin
    .from("products")
    .select("id, title, price")
    .in("id", uniqueProductIds);

  if (error) {
    return { ok: false, message: error.message };
  }

  const matchedProducts = products ?? [];
  if (matchedProducts.length === 0) {
    return { ok: false, message: "No matching inventory items were found for the selected sale." };
  }

  for (const product of matchedProducts) {
    const originalPrice = Number(product.price ?? 0);
    if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
      return { ok: false, message: `${product.title} needs a normal price before you can set a dollar sale price.` };
    }
    if (salePrice >= originalPrice) {
      return { ok: false, message: `Sale price must be lower than the current price for ${product.title}.` };
    }
  }

  const endsAtIso = `${saleEndsAt}T23:59:59.000Z`;
  for (const product of matchedProducts) {
    const originalPrice = Number(product.price ?? 0);
    const salePercentage = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
    const updateResult = await admin
      .from("products")
      .update({
        sale_percentage: salePercentage,
        sale_ends_at: endsAtIso,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (updateResult.error) {
      return { ok: false, message: updateResult.error.message };
    }
  }

  return {
    ok: true,
    message: `Started a sale price of $${salePrice.toFixed(2)} on ${matchedProducts.length} item${matchedProducts.length === 1 ? "" : "s"} through ${saleEndsAt}.`,
  };
}

export async function updateHomepageFeaturedInDatabaseSupabase(productId: string, featured: boolean) {
  const admin = await getAdminClient();
  const { data: product, error } = await admin.from("products").select("id, title").eq("id", productId).single();
  if (error || !product) return { ok: false, message: "Product not found." };

  const updateResult = await admin
    .from("products")
    .update({
      homepage_featured: featured,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateResult.error) return { ok: false, message: updateResult.error.message };
  return {
    ok: true,
    message: featured
      ? `${product.title} will appear as a homepage top pick.`
      : `${product.title} was removed from homepage top picks.`,
  };
}

export async function archiveProductInDatabaseSupabase(productId: string) {
  const admin = await getAdminClient();
  const { data: product, error } = await admin.from("products").select("id, title").eq("id", productId).single();
  if (error || !product) return { ok: false, message: "Product not found." };

  const updateResult = await admin
    .from("products")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      homepage_featured: false,
      sale_percentage: null,
      sale_ends_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateResult.error) return { ok: false, message: updateResult.error.message };
  return { ok: true, message: `${product.title} was moved to archived items.` };
}

export async function deleteArchivedProductInDatabaseSupabase(productId: string) {
  const admin = await getAdminClient();
  const { data: product, error } = await admin
    .from("products")
    .select("id, title, status, archived_at")
    .eq("id", productId)
    .single();
  if (error || !product) return { ok: false, message: "Product not found." };
  if (product.status !== "archived") return { ok: false, message: "Only archived items can be deleted." };

  const { data: imageRows, error: imageError } = await admin
    .from("product_images")
    .select("storage_path")
    .eq("product_id", productId);

  if (imageError) {
    return { ok: false, message: imageError.message };
  }

  const imagePaths = (imageRows ?? [])
    .map((row) => row.storage_path)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (imagePaths.length > 0) {
    await admin.storage.from(getProductImagesBucket()).remove(imagePaths);
  }

  const detachHistory = await admin
    .from("balance_line_items")
    .update({ product_id: null })
    .eq("product_id", productId);

  if (detachHistory.error) {
    return { ok: false, message: detachHistory.error.message };
  }

  const deleteResult = await admin.from("products").delete().eq("id", productId);
  if (deleteResult.error) return { ok: false, message: deleteResult.error.message };
  return { ok: true, message: `${product.title} was permanently deleted.` };
}

export async function markNotificationReadInDatabaseSupabase(notificationId: string) {
  const admin = await getAdminClient();
  const { data: notification, error } = await admin
    .from("notifications")
    .select("id, read_at")
    .eq("id", notificationId)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!notification) return { ok: false, message: "Notification not found." };
  if (notification.read_at) return { ok: true, message: "Notification already dismissed." };

  const updateResult = await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (updateResult.error) return { ok: false, message: updateResult.error.message };
  return { ok: true, message: "Notification dismissed." };
}

export async function saveCrossListedInventoryToDatabaseSupabase(input: {
  sku: string;
  itemName: string;
  cost?: number | null;
  platforms: string[];
}) {
  const admin = await getAdminClient();
  const sku = input.sku.trim();
  const itemName = input.itemName.trim();
  const hasCost = input.cost != null;
  const cost = hasCost ? Number(input.cost) : null;
  const platforms = input.platforms.filter((entry) => typeof entry === "string" && entry.length > 0);

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

  const existingRecord = await admin
    .from("cross_listed_inventory")
    .select("id, cost, platform_dates")
    .eq("sku", sku)
    .maybeSingle();

  if (existingRecord.error) {
    return { ok: false, message: existingRecord.error.message };
  }

  const today = new Date().toISOString().slice(0, 10);
  const previousPlatformDates = existingRecord.data?.platform_dates && typeof existingRecord.data.platform_dates === "object"
    ? existingRecord.data.platform_dates as Record<string, string>
    : {};
  const nextPlatformDates = Object.fromEntries(
    platforms.map((platform) => [platform, previousPlatformDates[platform] ?? today]),
  );

  const { error } = await admin
    .from("cross_listed_inventory")
    .upsert(
      {
        sku,
        item_name: itemName,
        cost: cost ?? (existingRecord.data?.cost == null ? null : Number(existingRecord.data.cost)),
        platforms,
        platform_dates: nextPlatformDates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "sku" },
    );

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: `Cross-listed inventory saved for SKU ${sku}.` };
}

export async function deleteCrossListedInventoryFromDatabaseSupabase(recordId: string) {
  const admin = await getAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("cross_listed_inventory")
    .select("id, sku")
    .eq("id", recordId)
    .maybeSingle();

  if (existingError) {
    return { ok: false, message: existingError.message };
  }

  if (!existing) {
    return { ok: false, message: "Cross-listed item not found." };
  }

  const { error } = await admin.from("cross_listed_inventory").delete().eq("id", recordId);
  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: `Removed SKU ${existing.sku} from cross-listed inventory.` };
}

function slugifyCategoryName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "inventory";
}

export async function createInventoryItemInDatabaseSupabase(input: {
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
  const title = input.title.trim();
  const description = input.description.trim();
  const categoryName = input.category.trim();
  const sku = input.sku.trim();
  const location = input.location.trim();
  const price = Number(input.price);
  const cost = Number(input.cost);
  const quantity = Number(input.quantity);
  const images = input.images.filter((file) => file instanceof File);

  if (!title) return { ok: false, message: "Item title is required." };
  if (!categoryName) return { ok: false, message: "Category is required." };
  if (!Number.isFinite(price) || price < 0) return { ok: false, message: "Price must be zero or higher." };
  if (!Number.isFinite(cost) || cost < 0) return { ok: false, message: "Cost must be zero or higher." };
  if (!Number.isInteger(quantity) || quantity < 0) return { ok: false, message: "Starting quantity must be zero or higher." };
  if (!sku) return { ok: false, message: "SKU is required so the item can be tracked in cross-listed inventory." };
  if (images.length > MAX_IMAGE_COUNT) return { ok: false, message: "Each item can have up to 6 photos." };
  if (images.some((file) => !file.type.startsWith("image/"))) return { ok: false, message: "Only image uploads are allowed." };
  if (images.some((file) => file.size > MAX_IMAGE_BYTES)) return { ok: false, message: "Each image must be 10MB or smaller." };

  const admin = await getAdminClient();
  const normalizedSlug = slugifyCategoryName(categoryName);

  let categoryId: string | null = null;
  const existingCategory = await admin
    .from("categories")
    .select("id")
    .or(`name.eq.${categoryName},slug.eq.${normalizedSlug}`)
    .maybeSingle();

  if (existingCategory.error) {
    return { ok: false, message: existingCategory.error.message };
  }

  if (existingCategory.data?.id) {
    categoryId = existingCategory.data.id;
  } else {
    const insertedCategory = await admin
      .from("categories")
      .insert({ name: categoryName, slug: normalizedSlug })
      .select("id")
      .single();

    if (insertedCategory.error || !insertedCategory.data) {
      return { ok: false, message: insertedCategory.error?.message ?? "Could not create category." };
    }

    categoryId = insertedCategory.data.id;
  }

  const status = deriveProductStatus(quantity, "active");
  const insertResult = await admin.from("products").insert({
    title,
    description,
    price,
    cost,
    category_id: categoryId,
    sku: sku || null,
    location: location || null,
    inventory_quantity: quantity,
    status,
    homepage_featured: false,
  }).select("id").single();

  if (insertResult.error || !insertResult.data) {
    return { ok: false, message: insertResult.error?.message ?? "Could not create product." };
  }

  const productId = insertResult.data.id;
  const bucket = getProductImagesBucket();
  const uploadedPaths: string[] = [];
  const imageRows: Array<{ product_id: string; image_url: string; storage_path: string; position: number }> = [];

  for (const [index, file] of images.entries()) {
    const safeFilename = slugifyFilename(file.name || `product-image-${Date.now()}.jpg`);
    const storagePath = `${productId}/${Date.now()}-${index}-${safeFilename}`;
    const arrayBuffer = await file.arrayBuffer();
    const uploadResult = await admin.storage.from(bucket).upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });

    if (uploadResult.error) {
      if (uploadedPaths.length) {
        await admin.storage.from(bucket).remove(uploadedPaths);
      }
      await admin.from("products").delete().eq("id", productId);
      return { ok: false, message: uploadResult.error.message };
    }

    uploadedPaths.push(storagePath);
    const publicUrl = admin.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
    imageRows.push({
      product_id: productId,
      image_url: publicUrl,
      storage_path: storagePath,
      position: index,
    });
  }

  const imagesInsert = await admin.from("product_images").insert(imageRows);
  if (imagesInsert.error) {
    if (uploadedPaths.length) {
      await admin.storage.from(bucket).remove(uploadedPaths);
    }
    await admin.from("products").delete().eq("id", productId);
    return { ok: false, message: imagesInsert.error.message };
  }

  const crossListedSave = await saveCrossListedInventoryToDatabaseSupabase({
    sku,
    itemName: title,
    cost,
    platforms: ["Website"],
  });
  if (!crossListedSave.ok) {
    await admin.from("product_images").delete().eq("product_id", productId);
    if (uploadedPaths.length) {
      await admin.storage.from(bucket).remove(uploadedPaths);
    }
    await admin.from("products").delete().eq("id", productId);
    return { ok: false, message: crossListedSave.message };
  }

  return {
    ok: true,
    message: `${title} was added with ${images.length} photo${images.length === 1 ? "" : "s"}, ${quantity} item${quantity === 1 ? "" : "s"} on hand, and a Website entry in cross-listed inventory.`,
  };
}

export async function updateInventoryItemInDatabaseSupabase(input: {
  productId: string;
  title: string;
  description: string;
  price: number;
  cost: number;
  category: string;
  sku: string;
  location: string;
}) {
  const productId = input.productId.trim();
  const title = input.title.trim();
  const description = input.description.trim();
  const categoryName = input.category.trim();
  const sku = input.sku.trim();
  const location = input.location.trim();
  const price = Number(input.price);
  const cost = Number(input.cost);

  if (!productId) return { ok: false, message: "Product record is missing." };
  if (!title) return { ok: false, message: "Item title is required." };
  if (!categoryName) return { ok: false, message: "Category is required." };
  if (!Number.isFinite(price) || price < 0) return { ok: false, message: "Price must be zero or higher." };
  if (!Number.isFinite(cost) || cost < 0) return { ok: false, message: "Cost must be zero or higher." };
  if (!sku) return { ok: false, message: "SKU is required so the item can be tracked in cross-listed inventory." };

  const admin = await getAdminClient();
  const { data: existingProduct, error: existingProductError } = await admin
    .from("products")
    .select("id, sku")
    .eq("id", productId)
    .single();

  if (existingProductError || !existingProduct) {
    return { ok: false, message: existingProductError?.message ?? "Product not found." };
  }

  const normalizedSlug = slugifyCategoryName(categoryName);
  let categoryId: string | null = null;
  const existingCategory = await admin
    .from("categories")
    .select("id")
    .or(`name.eq.${categoryName},slug.eq.${normalizedSlug}`)
    .maybeSingle();

  if (existingCategory.error) {
    return { ok: false, message: existingCategory.error.message };
  }

  if (existingCategory.data?.id) {
    categoryId = existingCategory.data.id;
  } else {
    const insertedCategory = await admin
      .from("categories")
      .insert({ name: categoryName, slug: normalizedSlug })
      .select("id")
      .single();

    if (insertedCategory.error || !insertedCategory.data) {
      return { ok: false, message: insertedCategory.error?.message ?? "Could not create category." };
    }

    categoryId = insertedCategory.data.id;
  }

  const productUpdate = await admin
    .from("products")
    .update({
      title,
      description,
      price,
      cost,
      sku,
      location: location || null,
      category_id: categoryId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (productUpdate.error) {
    return { ok: false, message: productUpdate.error.message };
  }

  const previousSku = typeof existingProduct.sku === "string" ? existingProduct.sku.trim() : "";
  const existingCrossListed = previousSku
    ? await admin
      .from("cross_listed_inventory")
      .select("id")
      .eq("sku", previousSku)
      .maybeSingle()
    : null;

  if (existingCrossListed?.error) {
    return { ok: false, message: existingCrossListed.error.message };
  }

  if (existingCrossListed?.data?.id) {
    const crossListedUpdate = await admin
      .from("cross_listed_inventory")
      .update({
        sku,
        item_name: title,
        cost,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingCrossListed.data.id);

    if (crossListedUpdate.error) {
      return { ok: false, message: crossListedUpdate.error.message };
    }
  } else {
    const crossListedSave = await saveCrossListedInventoryToDatabaseSupabase({
      sku,
      itemName: title,
      cost,
      platforms: ["Website"],
    });
    if (!crossListedSave.ok) {
      return { ok: false, message: crossListedSave.message };
    }
  }

  return {
    ok: true,
    message: `${title} inventory details were updated.`,
  };
}

export async function createInventoryItemsBulkInDatabaseSupabase(input: Array<{
  title: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  sku: string;
  location: string;
}>) {
  if (input.length === 0) {
    return { ok: false, message: "Add at least one inventory row to import." };
  }

  const admin = await getAdminClient();
  const categoryIdByName = new Map<string, string>();
  let createdCount = 0;

  for (const row of input) {
    const title = row.title.trim();
    const description = row.description.trim();
    const categoryName = row.category.trim();
    const sku = row.sku.trim();
    const location = row.location.trim();
    const price = Number(row.price);
    const quantity = Number(row.quantity);

    if (!title) return { ok: false, message: "Every imported row needs an item title." };
    if (!categoryName) return { ok: false, message: "Every imported row needs a category." };
    if (!Number.isFinite(price) || price < 0) return { ok: false, message: `Price must be zero or higher for ${title}.` };
    if (!Number.isInteger(quantity) || quantity < 0) return { ok: false, message: `Starting quantity must be zero or higher for ${title}.` };

    let categoryId = categoryIdByName.get(categoryName) ?? null;
    if (!categoryId) {
      const normalizedSlug = slugifyCategoryName(categoryName);
      const existingCategory = await admin
        .from("categories")
        .select("id")
        .or(`name.eq.${categoryName},slug.eq.${normalizedSlug}`)
        .maybeSingle();

      if (existingCategory.error) {
        return { ok: false, message: existingCategory.error.message };
      }

      if (existingCategory.data?.id) {
        categoryId = existingCategory.data.id;
      } else {
        const insertedCategory = await admin
          .from("categories")
          .insert({ name: categoryName, slug: normalizedSlug })
          .select("id")
          .single();

        if (insertedCategory.error || !insertedCategory.data) {
          return { ok: false, message: insertedCategory.error?.message ?? `Could not create category for ${title}.` };
        }

        categoryId = insertedCategory.data.id;
      }

      if (!categoryId) {
        return { ok: false, message: `Could not resolve a category for ${title}.` };
      }

      categoryIdByName.set(categoryName, categoryId);
    }

    const insertResult = await admin.from("products").insert({
      title,
      description,
      price,
      category_id: categoryId,
      sku: sku || null,
      location: location || null,
      inventory_quantity: quantity,
      status: deriveProductStatus(quantity, "active"),
    });

    if (insertResult.error) {
      return { ok: false, message: insertResult.error.message };
    }

    createdCount += 1;
  }

  return {
    ok: true,
    message: `${createdCount} inventory item${createdCount === 1 ? "" : "s"} imported successfully.`,
  };
}

export async function createCategoryInDatabaseSupabase(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, message: "Category name is required." };
  }

  const admin = await getAdminClient();
  const normalizedSlug = slugifyCategoryName(trimmedName);
  const existingCategory = await admin
    .from("categories")
    .select("id")
    .or(`name.eq.${trimmedName},slug.eq.${normalizedSlug}`)
    .maybeSingle();

  if (existingCategory.error) {
    return { ok: false, message: existingCategory.error.message };
  }

  if (existingCategory.data?.id) {
    return { ok: false, message: "That category already exists." };
  }

  const insertResult = await admin
    .from("categories")
    .insert({ name: trimmedName, slug: normalizedSlug });

  if (insertResult.error) {
    return { ok: false, message: insertResult.error.message };
  }

  return { ok: true, message: `${trimmedName} was added to categories.` };
}

export async function deleteCategoryInDatabaseSupabase(categoryId: string) {
  const admin = await getAdminClient();
  const { data: category, error: categoryError } = await admin
    .from("categories")
    .select("id, name")
    .eq("id", categoryId)
    .maybeSingle();

  if (categoryError) {
    return { ok: false, message: categoryError.message };
  }

  if (!category) {
    return { ok: false, message: "Category not found." };
  }

  const usage = await admin
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (usage.error) {
    return { ok: false, message: usage.error.message };
  }

  if ((usage.count ?? 0) > 0) {
    return { ok: false, message: "This category is still being used by inventory items." };
  }

  const deleteResult = await admin.from("categories").delete().eq("id", categoryId);
  if (deleteResult.error) {
    return { ok: false, message: deleteResult.error.message };
  }

  return { ok: true, message: `${category.name} was removed from categories.` };
}

export async function submitRestockRequestToDatabaseSupabase(productId: string) {
  const actor = await getCurrentActor().catch(() => null);
  const admin = await getAdminClient();
  const { data: product, error } = await admin.from("products").select("id, title").eq("id", productId).single();
  if (error || !product) return { ok: false, message: "Product not found." };
  const customer = actor?.role === "customer"
    ? await getCustomerSummaryByUserId(actor.id, { admin: true }).catch(() => null)
    : null;

  let existingQuery = admin.from("restock_requests").select("id").eq("product_id", productId).eq("status", "open");
  existingQuery = actor?.role === "customer" ? existingQuery.eq("customer_id", actor.id) : existingQuery.is("customer_id", null);
  const existing = await existingQuery.maybeSingle();
  if (existing.data) return { ok: true, message: "A restock request for this item is already in the admin queue." };

  await admin.from("restock_requests").insert({
    product_id: productId,
    customer_id: actor?.role === "customer" ? actor.id : null,
    email: actor?.email ?? null,
    status: "open",
  });
  await createAdminNotificationSupabase(admin, {
    type: "restock_request",
    productId,
    customerId: actor?.role === "customer" ? actor.id : null,
    label: customer
      ? `${customer.displayName} requested a restock check for ${product.title}.`
      : `Restock request received for ${product.title}.`,
    emailSubject: "Restock request",
    emailText: customer
      ? `${customer.displayName} requested a restock check for ${product.title}.`
      : `A restock request was received for ${product.title}.`,
  });
  return { ok: true, message: "The admin team has been asked about getting more of this item." };
}

export async function submitCustomerMessageToDatabaseSupabase(message: string) {
  const actor = await getCurrentActor();
  const customer = await getCurrentCustomerSupabase();
  const admin = await getAdminClient();
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return { ok: false, message: "Enter a message before sending it." };
  }

  const messageInsert = await admin.from("customer_messages").insert({
    customer_id: actor.id,
    body: trimmedMessage,
    created_by: actor.id,
    sender_role: "customer",
  });

  if (messageInsert.error) {
    return { ok: false, message: messageInsert.error.message };
  }

  await createAdminNotificationSupabase(admin, {
    type: "customer_message",
    customerId: actor.id,
    label: `${customer.displayName}: ${trimmedMessage}`,
    payload: { message: trimmedMessage },
    emailSubject: "Customer message",
    emailText: `${customer.displayName} sent a new customer message:\n\n${trimmedMessage}`,
  });

  return {
    ok: true,
    message: "Your message was sent to the admin team.",
  };
}

export async function submitCustomerItemRequestToDatabaseSupabase(request: string) {
  const actor = await getCurrentActor();
  const customer = await getCurrentCustomerSupabase();
  const admin = await getAdminClient();
  const trimmedRequest = request.trim();

  if (!trimmedRequest) {
    return { ok: false, message: "Add a request before sending it." };
  }

  const preview = trimmedRequest.length > 90 ? `${trimmedRequest.slice(0, 87)}...` : trimmedRequest;

  const requestInsert = await admin.from("customer_item_requests").insert({
    customer_id: actor.id,
    body: trimmedRequest,
    created_by: actor.id,
    status: "open",
  });

  if (requestInsert.error) {
    return { ok: false, message: requestInsert.error.message };
  }

  await createAdminNotificationSupabase(admin, {
    type: "customer_item_request",
    customerId: actor.id,
    label: `${customer.displayName} requested help finding an item: ${preview}`,
    payload: { request: trimmedRequest },
    emailSubject: "Customer item request",
    emailText: `${customer.displayName} requested help finding an item:\n\n${trimmedRequest}`,
  });

  return {
    ok: true,
    message: "Your item request was sent to the admin team.",
  };
}

export async function replyToCustomerMessageSupabase(customerId: string, message: string) {
  const actor = await getCurrentActor();
  const adminClient = await getAdminClient();
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return { ok: false, message: "Enter a reply before sending it." };
  }

  const customer = await getCustomerSummaryByUserId(customerId, { admin: true });

  const insertResult = await adminClient.from("customer_messages").insert({
    customer_id: customerId,
    body: trimmedMessage,
    created_by: actor.id,
    sender_role: "admin",
  });

  if (insertResult.error) {
    return { ok: false, message: insertResult.error.message };
  }

  return {
    ok: true,
    message: `Reply saved for ${customer.displayName}.`,
  };
}

export async function submitShipmentRequestToDatabaseSupabase() {
  const actor = await getCurrentActor();
  const customer = await getCurrentCustomerSupabase();
  const allowed = canRequestShipment(customer.accountState, customer.shipmentStatus);
  if (!allowed) return { ok: false, message: "Shipment request is blocked for this account." };

  const admin = await getAdminClient();
  const { data: pendingLineItem } = await admin
    .from("balance_line_items")
    .select("cycle_id, balance_cycles!inner(customer_id)")
    .eq("balance_cycles.customer_id", actor.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const cycle = pendingLineItem?.cycle_id
    ? { id: pendingLineItem.cycle_id }
    : await ensureActiveCycle(actor.id);
  const { data: address } = await admin.from("addresses").select("id").eq("user_id", actor.id).eq("is_default", true).maybeSingle();
  const nextStatus = nextShipmentStatus(customer.shipmentStatus, "request");

  const { error } = await admin.from("shipments").insert({ cycle_id: cycle.id, customer_id: actor.id, address_id: address?.id ?? null, address_confirmed: true, status: nextStatus, requested_at: new Date().toISOString() });
  if (error) return { ok: false, message: error.message };

  await createAdminNotificationSupabase(admin, {
    type: "shipment_request",
    customerId: actor.id,
    label: `${customer.displayName} requested shipment confirmation.`,
    emailSubject: "Shipment request",
    emailText: `${customer.displayName} requested shipment confirmation.`,
  });
  return { ok: true, message: "Shipment request submitted for admin review.", nextStatus };
}

export async function addCustomerToShipmentQueueSupabase(customerId: string) {
  const admin = await getAdminClient();
  const customer = await getCustomerSummaryByUserId(customerId, { admin: true });
  const allowed = canRequestShipment(customer.accountState, customer.shipmentStatus);
  if (!allowed) return { ok: false, message: "Shipment request is blocked for this account." };

  const { data: existingShipment } = await admin
    .from("shipments")
    .select("id")
    .eq("customer_id", customerId)
    .neq("status", "completed")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingShipment) {
    return { ok: true, message: `${customer.displayName} is already in the shipment queue.` };
  }

  const { data: pendingLineItem } = await admin
    .from("balance_line_items")
    .select("cycle_id, balance_cycles!inner(customer_id)")
    .eq("balance_cycles.customer_id", customerId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const cycle = pendingLineItem?.cycle_id
    ? { id: pendingLineItem.cycle_id }
    : await ensureActiveCycle(customerId);
  const { data: address } = await admin.from("addresses").select("id").eq("user_id", customerId).eq("is_default", true).maybeSingle();
  const nextStatus = nextShipmentStatus(customer.shipmentStatus, "request");

  const { error } = await admin.from("shipments").insert({
    cycle_id: cycle.id,
    customer_id: customerId,
    address_id: address?.id ?? null,
    address_confirmed: true,
    status: nextStatus,
    requested_at: new Date().toISOString(),
    shipping_invoice: null,
  });
  if (error) return { ok: false, message: error.message };

  await createAdminNotificationSupabase(admin, {
    type: "shipment_request",
    customerId,
    label: `${customer.displayName} was added to the shipment queue by admin.`,
    emailSubject: "Shipment queue update",
    emailText: `${customer.displayName} was added to the shipment queue by admin.`,
  });
  return { ok: true, message: `${customer.displayName} was added to the shipment queue.`, nextStatus };
}

export async function cancelShipmentRequestInDatabaseSupabase(shipmentId?: string) {
  const actor = await getCurrentActor();
  const admin = await getAdminClient();

  let query = admin
    .from("shipments")
    .select("id, customer_id, status")
    .neq("status", "completed")
    .order("requested_at", { ascending: false })
    .limit(1);

  if (shipmentId) {
    query = query.eq("id", shipmentId);
  } else {
    query = query.eq("customer_id", actor.id);
  }

  const { data: shipment, error } = await query.maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!shipment) return { ok: false, message: "Open shipment request not found." };
  if (shipment.status === "completed") return { ok: false, message: "Completed shipments cannot be canceled." };

  const deleteResult = await admin.from("shipments").delete().eq("id", shipment.id);
  if (deleteResult.error) return { ok: false, message: deleteResult.error.message };

  const customer = await getCustomerSummaryByUserId(shipment.customer_id, { admin: true });
  return {
    ok: true,
    message: `${customer.displayName} shipment request was canceled.`,
    nextStatus: "none",
  };
}

export async function updateShipmentInDatabaseSupabase(
  shipmentId: string,
  nextStatus: ShipmentStatus,
  trackingNumber: string,
  shippingInvoice: string,
  customerId?: string,
  requestedAt?: string,
) {
  const admin = await getAdminClient();
  const trimmedShipmentId = shipmentId.trim();
  const trimmedCustomerId = customerId?.trim() ?? "";
  const trimmedRequestedAt = requestedAt?.trim() ?? "";
  let shipmentQuery = admin
    .from("shipments")
    .select("id, customer_id, cycle_id, billing_cycle_id, shipping_invoice, requested_at")
    .eq("id", trimmedShipmentId)
    .maybeSingle();
  let { data: shipment, error } = await shipmentQuery;

  if ((!shipment || error) && trimmedCustomerId && trimmedRequestedAt) {
    const timestampLookup = await admin
      .from("shipments")
      .select("id, customer_id, cycle_id, billing_cycle_id, shipping_invoice, requested_at")
      .eq("customer_id", trimmedCustomerId)
      .eq("requested_at", trimmedRequestedAt)
      .maybeSingle();
    shipment = timestampLookup.data;
    error = timestampLookup.error;
  }

  if ((!shipment || error) && trimmedCustomerId) {
    const fallbackLookup = await admin
      .from("shipments")
      .select("id, customer_id, cycle_id, billing_cycle_id, shipping_invoice, requested_at")
      .eq("customer_id", trimmedCustomerId)
      .neq("status", "completed")
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    shipment = fallbackLookup.data;
    error = fallbackLookup.error;
  }

  if (error || !shipment) return { ok: false, message: "Shipment record not found." };

  const trimmedShippingInvoice = shippingInvoice.trim();
  const previousShippingAmount = parseShippingInvoiceAmount(shipment.shipping_invoice);
  const nextShippingAmount = parseShippingInvoiceAmount(trimmedShippingInvoice);
  const shipmentDate = nextStatus === "completed" ? siteToday() : null;

  const previousAppliedCycleId =
    shipment.billing_cycle_id
    ?? ((previousShippingAmount ?? 0) !== 0 ? shipment.cycle_id : null);

  let nextBillingCycleId: string | null = shipment.billing_cycle_id ?? null;

  if ((nextShippingAmount ?? 0) !== 0 && !nextBillingCycleId) {
    const activeCycle = await ensureActiveCycle(shipment.customer_id);
    nextBillingCycleId = activeCycle.id;
  }

  const shouldRebalanceShipping =
    previousAppliedCycleId !== nextBillingCycleId
    || previousShippingAmount !== nextShippingAmount;

  if (shouldRebalanceShipping && previousAppliedCycleId && (previousShippingAmount ?? 0) !== 0) {
    const rollback = await adjustCycleShippingTotalSupabase(admin, previousAppliedCycleId, -(previousShippingAmount ?? 0));
    if (!rollback.ok) {
      return rollback;
    }
  }

  if (shouldRebalanceShipping && nextBillingCycleId && (nextShippingAmount ?? 0) !== 0) {
    const apply = await adjustCycleShippingTotalSupabase(admin, nextBillingCycleId, nextShippingAmount ?? 0);
    if (!apply.ok) {
      return apply;
    }
  }

  const updateResult = await admin.from("shipments").update({
    status: nextStatus,
    tracking_number: trackingNumber.trim() || null,
    shipping_invoice: trimmedShippingInvoice || null,
    billing_cycle_id: (nextShippingAmount ?? 0) !== 0 ? nextBillingCycleId : null,
    shipment_date: shipmentDate,
    completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", shipment.id);
  if (updateResult.error) return { ok: false, message: updateResult.error.message };

  if (nextStatus === "completed" && shipment.cycle_id) {
    const archiveItems = await admin
      .from("balance_line_items")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("cycle_id", shipment.cycle_id)
      .neq("status", "archived");

    if (archiveItems.error) {
      return { ok: false, message: archiveItems.error.message };
    }
  }

  if (shipmentDate) {
    await admin.from("customer_profiles").update({ last_shipment_date: shipmentDate }).eq("user_id", shipment.customer_id);
  }

  const customer = await getCustomerSummaryByUserId(shipment.customer_id, { admin: true });
  return { ok: true, message: `${customer.displayName} shipment updated to ${nextStatus.replaceAll("_", " ")}.`, nextStatus };
}

export async function updateCustomerAccountStateSupabase(customerId: string, nextState: AccountState) {
  const admin = await getAdminClient();
  const timestamp = new Date().toISOString();
  const { data: existingRoleRow, error: existingRoleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", customerId)
    .maybeSingle();

  if (existingRoleError) {
    return { ok: false, message: existingRoleError.message };
  }

  const { data: savedRoleRow, error } = await admin
    .from("user_roles")
    .upsert({
      user_id: customerId,
      role: existingRoleRow?.role ?? "customer",
      account_state: nextState,
      approved_at: nextState === "approved" ? timestamp : null,
      updated_at: timestamp,
    }, { onConflict: "user_id" })
    .select("user_id, account_state")
    .single();

  if (error) return { ok: false, message: error.message };
  if (savedRoleRow.account_state !== nextState) {
    return { ok: false, message: "Customer approval state did not save correctly." };
  }

  const customer = await getCustomerSummaryByUserId(customerId, { admin: true });
  await admin.from("notifications").insert({ type: "pending_approval", customer_id: customerId, payload: { label: `${customer.displayName} was updated to ${nextState.replaceAll("_", " ")}.` } });
  return { ok: true, message: `${customer.displayName} is now ${nextState.replaceAll("_", " ")}.`, nextStatus: nextState };
}

export async function updateCustomerRoleInDatabaseSupabase(customerId: string, nextRole: "admin") {
  const admin = await getAdminClient();
  const { error } = await admin.from("user_roles").update({ role: nextRole, account_state: "approved", approved_at: new Date().toISOString() }).eq("user_id", customerId);
  if (error) return { ok: false, message: error.message };

  const customer = await getCustomerSummaryByUserId(customerId, { admin: true });
  await admin.from("notifications").insert({ type: "pending_approval", customer_id: customerId, payload: { label: `${customer.displayName} was promoted to ${nextRole.replaceAll("_", " ")}.` } });
  return { ok: true, message: `${customer.displayName} is now an ${nextRole.replaceAll("_", " ")}.` };
}

export async function addCustomerNoteToDatabaseSupabase(customerId: string, note: string) {
  const actor = await getCurrentActor();
  const trimmedNote = note.trim();
  if (!trimmedNote) return { ok: false, message: "Enter a note before saving." };

  const admin = await getAdminClient();
  const { error } = await admin.from("customer_notes").insert({ customer_id: customerId, body: trimmedNote, created_by: actor.id });
  if (error) return { ok: false, message: error.message };

  const customer = await getCustomerSummaryByUserId(customerId, { admin: true });
  return { ok: true, message: `Saved an internal note for ${customer.displayName}.` };
}

export async function addManualBalanceItemToDatabaseSupabase(title: string, quantity: number, unitPrice: number, recordedAt?: string, customerId?: string) {
  const actor = await getCurrentActor();
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { ok: false, message: "Enter an item title." };
  if (quantity < 1 || unitPrice < 0) return { ok: false, message: "Quantity must be at least 1 and price cannot be negative." };

  const normalizedRecordedAt = normalizeRecordedAt(recordedAt);
  if (recordedAt && !normalizedRecordedAt) return { ok: false, message: "Enter a valid record date." };
  const context = await getTargetCycleContext(customerId, {
    dueDate: dueDateForReferenceDate(normalizedRecordedAt?.date),
    ensureIfMissing: Boolean(customerId),
  });
  if (!context) return { ok: false, message: "No active balance cycle is available for admin adjustments yet." };

  const admin = await getAdminClient();
  const { error } = await admin.from("balance_line_items").insert({
    cycle_id: context.cycle.id,
    item_type: "manual_item",
    description: trimmedTitle,
    quantity,
    unit_price: unitPrice,
    status: "adjusted",
    created_by: actor.id,
    ...(normalizedRecordedAt ? { created_at: normalizedRecordedAt.timestamp } : {}),
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `${trimmedTitle} was added to the active balance cycle.` };
}

export async function updateClaimedItemInDatabaseSupabase(claimId: string, quantity: number, unitPrice: number) {
  if (quantity < 1 || unitPrice < 0) return { ok: false, message: "Quantity must be at least 1 and price cannot be negative." };

  const admin = await getAdminClient();
  const { data: item, error } = await admin.from("balance_line_items").select("id, cycle_id, description, quantity, item_type, product_id").eq("id", claimId).single();
  if (error || !item) return { ok: false, message: "Claimed item not found." };

  if (item.item_type === "claim" && item.product_id) {
    const quantityDiff = Number(quantity) - Number(item.quantity ?? 0);
    if (quantityDiff !== 0) {
      const { data: product } = await admin.from("products").select("inventory_quantity").eq("id", item.product_id).single();
      const nextQuantity = Number(product?.inventory_quantity ?? 0) - quantityDiff;
      if (nextQuantity < 0) return { ok: false, message: "Inventory cannot go below zero." };
      await admin.from("products").update({ inventory_quantity: nextQuantity, updated_at: new Date().toISOString() }).eq("id", item.product_id);
    }
  }

  const updateResult = await admin.from("balance_line_items").update({ quantity, unit_price: unitPrice, updated_at: new Date().toISOString() }).eq("id", claimId);
  if (updateResult.error) return { ok: false, message: updateResult.error.message };
  await finalizeCycleIfSettled(admin, item.cycle_id);
  return { ok: true, message: `${item.description} was updated.` };
}

export async function removeClaimedItemFromDatabaseSupabase(claimId: string) {
  const admin = await getAdminClient();
  const { data: item, error } = await admin.from("balance_line_items").select("id, cycle_id, description, quantity, item_type, product_id").eq("id", claimId).single();
  if (error || !item) return { ok: false, message: "Claimed item not found." };

  if (item.item_type === "claim" && item.product_id) {
    const { data: product } = await admin.from("products").select("inventory_quantity").eq("id", item.product_id).single();
    const nextQuantity = Number(product?.inventory_quantity ?? 0) + Number(item.quantity ?? 0);
    await admin.from("products").update({ inventory_quantity: nextQuantity, updated_at: new Date().toISOString() }).eq("id", item.product_id);
  }

  const removeResult = await admin.from("balance_line_items").delete().eq("id", claimId);
  if (removeResult.error) return { ok: false, message: removeResult.error.message };
  await finalizeCycleIfSettled(admin, item.cycle_id);
  return { ok: true, message: `${item.description} was removed from the active balance.` };
}

export async function applyBalanceAdjustmentsToDatabaseSupabase(shippingChange: number, adjustmentChange: number, customerId?: string) {
  let context: Awaited<ReturnType<typeof getTargetCycleContext>> = customerId
    ? pickPrimaryCycleContext(await listActiveCycleContexts(customerId))
    : null;
  if (!context) {
    context = await getTargetCycleContext(customerId, { ensureIfMissing: Boolean(customerId) });
  }
  if (!context) return { ok: false, message: "No active balance cycle is available for admin adjustments yet." };

  const nextShipping = Number(context.cycle.shipping_total ?? 0) + shippingChange;
  const nextAdjustments = Number(context.cycle.adjustments_total ?? 0) + adjustmentChange;
  if (nextShipping < 0) return { ok: false, message: "Shipping total cannot go below zero." };

  const admin = await getAdminClient();
  const { error } = await admin.from("balance_cycles").update({ shipping_total: nextShipping, adjustments_total: nextAdjustments, updated_at: new Date().toISOString() }).eq("id", context.cycle.id);
  if (error) return { ok: false, message: error.message };
  await finalizeCycleIfSettled(admin, context.cycle.id);
  return { ok: true, message: "Balance charges were updated." };
}

export async function applyPaymentToDatabaseSupabase(paymentAmount: number, creditAmount: number, recordedAt?: string, customerId?: string) {
  const normalizedRecordedAt = normalizeRecordedAt(recordedAt);
  if (recordedAt && !normalizedRecordedAt) return { ok: false, message: "Enter a valid record date." };
  if (!customerId) return { ok: false, message: "Choose a customer before applying a payment." };
  if (paymentAmount < 0 || creditAmount < 0) return { ok: false, message: "Payment and credit amounts must be zero or higher." };

  const customer = await getCustomerSummaryByUserId(customerId, { admin: true });
  const cycleContexts = await listOpenCycleContextsForPayment(customerId, dueDateForReferenceDate(normalizedRecordedAt?.date));
  if (cycleContexts.length === 0) return { ok: false, message: "No active balance cycle is available for payment." };

  const totalDue = cycleContexts.reduce((sum, context) => sum + context.due, 0);
  const totalApplicableCredit = Math.min(creditAmount, customer.creditBalance, totalDue);
  const preview = applyPaymentToBalance(totalDue, paymentAmount, totalApplicableCredit);
  const admin = await getAdminClient();
  let remainingPayment = paymentAmount;
  let remainingCreditToApply = totalApplicableCredit;

  for (const context of cycleContexts) {
    const cycleDue = context.due;
    if (cycleDue <= 0) continue;

    const creditApplied = Math.min(remainingCreditToApply, cycleDue);
    remainingCreditToApply -= creditApplied;
    const dueAfterCredit = cycleDue - creditApplied;
    const appliedAmount = Math.min(remainingPayment, Math.max(dueAfterCredit, 0));
    remainingPayment -= appliedAmount;

    const cycleUpdate = await admin.from("balance_cycles").update({
      payments_applied: Number(context.cycle.payments_applied ?? 0) + appliedAmount,
      credits_applied: Number(context.cycle.credits_applied ?? 0) + creditApplied,
      updated_at: new Date().toISOString(),
    }).eq("id", context.cycle.id);
    if (cycleUpdate.error) return { ok: false, message: cycleUpdate.error.message };

    if (appliedAmount > 0) {
      const paymentInsert = await admin.from("payments").insert({
        cycle_id: context.cycle.id,
        amount: appliedAmount,
        applied_amount: appliedAmount,
        overpayment_amount: 0,
        notes: "Admin-applied payment",
        ...(normalizedRecordedAt ? { created_at: normalizedRecordedAt.timestamp } : {}),
      });
      if (paymentInsert.error) return { ok: false, message: paymentInsert.error.message };
    }

    if (creditApplied > 0) {
      const creditInsert = await admin.from("credits").insert({
        customer_id: customerId,
        amount: -creditApplied,
        reason: "Applied to active balance cycle",
        ...(normalizedRecordedAt ? { created_at: normalizedRecordedAt.timestamp } : {}),
      });
      if (creditInsert.error) return { ok: false, message: creditInsert.error.message };
    }

    await finalizeCycleIfSettled(admin, context.cycle.id, normalizedRecordedAt?.date ?? siteToday());
  }

  const totalOverpayment = Math.max(remainingPayment, 0);
  const nextCreditBalance = Math.max(customer.creditBalance - totalApplicableCredit, 0) + totalOverpayment;
  const profileUpdate = await admin.from("customer_profiles").update({ credit_balance: nextCreditBalance }).eq("user_id", customerId);
  if (profileUpdate.error) return { ok: false, message: profileUpdate.error.message };
  if (totalOverpayment > 0) {
    const overpaymentInsert = await admin.from("credits").insert({
      customer_id: customerId,
      amount: totalOverpayment,
      reason: "Overpayment credit",
      ...(normalizedRecordedAt ? { created_at: normalizedRecordedAt.timestamp } : {}),
    });
    if (overpaymentInsert.error) return { ok: false, message: overpaymentInsert.error.message };
  }

  return {
    ok: true,
    message: "Payment applied to the active balance cycle.",
    remainingBalance: Math.max(preview.remaining, 0),
    overpayment: totalOverpayment,
  };
}

export async function updatePaymentInDatabaseSupabase(paymentId: string, paymentAmount: number, recordedAt?: string) {
  const normalizedRecordedAt = normalizeRecordedAt(recordedAt);
  if (recordedAt && !normalizedRecordedAt) return { ok: false, message: "Enter a valid record date." };
  if (paymentAmount < 0) return { ok: false, message: "Payment amount must be zero or higher." };

  const admin = await getAdminClient();
  const { data: paymentRow, error: paymentError } = await admin
    .from("payments")
    .select("id, cycle_id, amount, applied_amount, overpayment_amount, created_at, balance_cycles!inner(id, customer_id, status, shipping_total, adjustments_total, payments_applied, credits_applied)")
    .eq("id", paymentId)
    .single();

  if (paymentError || !paymentRow) {
    return { ok: false, message: paymentError?.message ?? "Payment not found." };
  }

  const cycleRow = Array.isArray(paymentRow.balance_cycles) ? paymentRow.balance_cycles[0] : paymentRow.balance_cycles;
  if (!cycleRow) {
    return { ok: false, message: "Payment cycle could not be found." };
  }

  const customer = await getCustomerSummaryByUserId(cycleRow.customer_id, { admin: true });
  const previousOverpayment = Number(paymentRow.overpayment_amount ?? 0);
  if (previousOverpayment > 0 && customer.creditBalance < previousOverpayment) {
    return { ok: false, message: "This payment's overpayment credit has already been used, so it can't be edited safely." };
  }

  const cycleSubtotal = await (async () => {
    const { data, error } = await admin
      .from("balance_line_items")
      .select("quantity, unit_price")
      .eq("cycle_id", cycleRow.id);
    if (error) throw error;
    return (data ?? []).reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0), 0);
  })();

  const previousAppliedAmount = Number(paymentRow.applied_amount ?? paymentRow.amount ?? 0);
  const otherAppliedPayments = Math.max(0, Number(cycleRow.payments_applied ?? 0) - previousAppliedAmount);
  const balanceDueBeforeThisPayment = Math.max(
    cycleSubtotal
      + Number(cycleRow.shipping_total ?? 0)
      + Number(cycleRow.adjustments_total ?? 0)
      - otherAppliedPayments
      - Number(cycleRow.credits_applied ?? 0),
    0,
  );
  const paymentBreakdown = getPaymentBreakdown(balanceDueBeforeThisPayment, paymentAmount);

  if (cycleRow.status === "archived") {
    const { data: activeCycles, error: activeCyclesError } = await admin
      .from("balance_cycles")
      .select("id, shipping_total, adjustments_total, payments_applied, credits_applied")
      .eq("customer_id", cycleRow.customer_id)
      .eq("status", "active");
    if (activeCyclesError) return { ok: false, message: activeCyclesError.message };

    const displacedCycle = (activeCycles ?? []).find((entry) => entry.id !== cycleRow.id);
    if (displacedCycle) {
      const { data: displacedItems, error: displacedItemsError } = await admin
        .from("balance_line_items")
        .select("id")
        .eq("cycle_id", displacedCycle.id)
        .limit(1);
      if (displacedItemsError) return { ok: false, message: displacedItemsError.message };

      const displacedHasContent = (displacedItems?.length ?? 0) > 0
        || Number(displacedCycle.shipping_total ?? 0) !== 0
        || Number(displacedCycle.adjustments_total ?? 0) !== 0
        || Number(displacedCycle.payments_applied ?? 0) !== 0
        || Number(displacedCycle.credits_applied ?? 0) !== 0;

      if (displacedHasContent) {
        return { ok: false, message: "This archived payment belongs to a cycle that no longer matches the active balance. Clear the newer cycle first, then edit this payment." };
      }

      const displacedArchive = await admin
        .from("balance_cycles")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", displacedCycle.id);
      if (displacedArchive.error) return { ok: false, message: displacedArchive.error.message };
    }

    const restoreCycle = await admin
      .from("balance_cycles")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", cycleRow.id);
    if (restoreCycle.error) return { ok: false, message: restoreCycle.error.message };

    const archivedInvoiceDelete = await admin
      .from("archived_invoices")
      .delete()
      .eq("cycle_id", cycleRow.id);
    if (archivedInvoiceDelete.error) return { ok: false, message: archivedInvoiceDelete.error.message };
  }

  const cycleUpdate = await admin
    .from("balance_cycles")
    .update({
      payments_applied: otherAppliedPayments + paymentBreakdown.appliedAmount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cycleRow.id);
  if (cycleUpdate.error) return { ok: false, message: cycleUpdate.error.message };

  const paymentUpdate = await admin
    .from("payments")
    .update({
      amount: paymentAmount,
      applied_amount: paymentBreakdown.appliedAmount,
      overpayment_amount: paymentBreakdown.overpaymentAmount,
      ...(normalizedRecordedAt ? { created_at: normalizedRecordedAt.timestamp } : {}),
    })
    .eq("id", paymentId);
  if (paymentUpdate.error) return { ok: false, message: paymentUpdate.error.message };

  const nextCreditBalance = Math.max(customer.creditBalance - previousOverpayment, 0) + paymentBreakdown.overpaymentAmount;
  const profileUpdate = await admin
    .from("customer_profiles")
    .update({ credit_balance: nextCreditBalance })
    .eq("user_id", cycleRow.customer_id);
  if (profileUpdate.error) return { ok: false, message: profileUpdate.error.message };

  await finalizeCycleIfSettled(admin, cycleRow.id, normalizedRecordedAt?.date ?? siteToday());

  return {
    ok: true,
    message: "Payment updated.",
    remainingBalance: Math.max(balanceDueBeforeThisPayment - paymentAmount, 0),
    overpayment: paymentBreakdown.overpaymentAmount,
  };
}

export async function updateCreditInDatabaseSupabase(creditId: string, creditAmount: number, recordedAt?: string, reason?: string) {
  const normalizedRecordedAt = normalizeRecordedAt(recordedAt);
  if (recordedAt && !normalizedRecordedAt) return { ok: false, message: "Enter a valid record date." };

  const admin = await getAdminClient();
  const { data: creditRow, error: creditError } = await admin
    .from("credits")
    .select("id, customer_id, amount, reason, created_at")
    .eq("id", creditId)
    .single();
  if (creditError || !creditRow) {
    return { ok: false, message: creditError?.message ?? "Credit entry not found." };
  }

  const previousAmount = Number(creditRow.amount ?? 0);
  if (previousAmount < 0) {
    return { ok: false, message: "Applied-credit history can’t be edited from this page." };
  }
  if (creditAmount < 0) {
    return { ok: false, message: "Credit amount must be zero or higher." };
  }

  const customer = await getCustomerSummaryByUserId(creditRow.customer_id, { admin: true });
  const nextCreditBalance = customer.creditBalance - previousAmount + creditAmount;
  if (nextCreditBalance < 0) {
    return { ok: false, message: "This credit has already been used, so it can’t be reduced that far." };
  }

  const creditUpdate = await admin
    .from("credits")
    .update({
      amount: creditAmount,
      reason: (reason?.trim() || creditRow.reason || "Credit adjustment"),
      ...(normalizedRecordedAt ? { created_at: normalizedRecordedAt.timestamp } : {}),
    })
    .eq("id", creditId);
  if (creditUpdate.error) return { ok: false, message: creditUpdate.error.message };

  const profileUpdate = await admin
    .from("customer_profiles")
    .update({ credit_balance: nextCreditBalance })
    .eq("user_id", creditRow.customer_id);
  if (profileUpdate.error) return { ok: false, message: profileUpdate.error.message };

  return {
    ok: true,
    message: "Credit updated.",
  };
}

export async function updateCurrentCustomerProfileSupabase(input: { street: string; city: string; region: string; postalCode: string; timezone: string }) {
  const actor = await getCurrentActor();
  return saveCustomerProfileAddressSupabase(actor.id, input);
}

export async function updateCustomerProfileByAdminSupabase(customerId: string, input: { street: string; city: string; region: string; postalCode: string; timezone: string }) {
  const customer = await getCustomerSummaryByUserId(customerId, { admin: true });
  const result = await saveCustomerProfileAddressSupabase(customerId, input);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true as const,
    message: `${customer.displayName} profile details updated.`,
  };
}

export async function createEventInDatabaseSupabase(input: {
  title: string;
  startsAtLocal: string;
  description: string;
  externalLink: string;
  platform: string;
  timeZone: string;
  repeatWeekly?: boolean;
  repeatUntilLocal?: string;
}) {
  const admin = await getAdminClient();
  const title = input.title.trim();
  const description = input.description.trim();
  const platform = input.platform.trim();
  const externalLink = input.externalLink.trim();
  const timeZone = input.timeZone.trim() || "America/New_York";

  if (!title) return { ok: false, message: "Event title is required." };
  if (!input.startsAtLocal) return { ok: false, message: "Event date and time are required." };

  const startsAtLocalValues = buildWeeklyRecurringLocalDateTimes(
    input.startsAtLocal,
    input.repeatWeekly ?? false,
    input.repeatUntilLocal ?? "",
  );
  const { error } = await admin.from("events").insert(
    startsAtLocalValues.map((startsAtLocal) => ({
      title,
      starts_at: zonedLocalDateTimeToIso(startsAtLocal, timeZone),
      description,
      external_link: externalLink || null,
      platform: platform || null,
    })),
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message:
      startsAtLocalValues.length === 1
        ? `${title} was added to the events calendar.`
        : `${title} was added to the events calendar ${startsAtLocalValues.length} times.`,
  };
}

export async function updateEventInDatabaseSupabase(input: {
  eventId: string;
  title: string;
  startsAtLocal: string;
  description: string;
  externalLink: string;
  platform: string;
  timeZone: string;
}) {
  const admin = await getAdminClient();
  const eventId = input.eventId.trim();
  const title = input.title.trim();
  const description = input.description.trim();
  const platform = input.platform.trim();
  const externalLink = input.externalLink.trim();
  const timeZone = input.timeZone.trim() || "America/New_York";

  if (!eventId) return { ok: false, message: "Event record is missing." };
  if (!title) return { ok: false, message: "Event title is required." };
  if (!input.startsAtLocal) return { ok: false, message: "Event date and time are required." };

  const { error } = await admin
    .from("events")
    .update({
      title,
      starts_at: zonedLocalDateTimeToIso(input.startsAtLocal, timeZone),
      description,
      external_link: externalLink || null,
      platform: platform || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: `${title} was updated.` };
}

export async function deleteEventInDatabaseSupabase(eventId: string) {
  const admin = await getAdminClient();
  const trimmed = eventId.trim();
  if (!trimmed) {
    return { ok: false, message: "Event record is missing." };
  }

  const { error } = await admin.from("events").delete().eq("id", trimmed);
  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Event deleted." };
}
