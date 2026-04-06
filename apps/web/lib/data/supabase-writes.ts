import "server-only";

import { applyPaymentToBalance, canRequestShipment, deriveProductStatus, nextShipmentStatus, shouldArchiveBalance, validateClaimAttempt } from "@fatguydiscounts/core";
import type { AccountState, ShipmentStatus } from "@fatguydiscounts/types";
import {
  dueDateForReferenceDate,
  ensureActiveCycle,
  formatCycleLabel,
  getAdminClient,
  getCurrentActor,
  getCustomerSummaryByUserId,
  getTargetCycleContext,
  nextDueDateFromToday,
  siteToday,
} from "./supabase-helpers";
import { getCurrentCustomerSupabase, listProductsSupabase } from "./supabase-reads";
import { getProductImagesBucket, getSiteUrl } from "../supabase";
import { zonedLocalDateTimeToIso } from "../events";
import { getProductPath } from "../products";

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
    await admin.from("notifications").insert({ type: "low_stock", product_id: productId, payload: { label: `${product.title} reached low stock.` } });
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
  platforms: string[];
}) {
  const admin = await getAdminClient();
  const sku = input.sku.trim();
  const itemName = input.itemName.trim();
  const platforms = input.platforms.filter((entry) => typeof entry === "string" && entry.length > 0);

  if (!sku) {
    return { ok: false, message: "SKU is required." };
  }

  if (!itemName) {
    return { ok: false, message: "Item name is required." };
  }

  if (platforms.length === 0) {
    return { ok: false, message: "Select at least one platform." };
  }

  const existingRecord = await admin
    .from("cross_listed_inventory")
    .select("id, platform_dates")
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
  const quantity = Number(input.quantity);
  const images = input.images.filter((file) => file instanceof File);

  if (!title) return { ok: false, message: "Item title is required." };
  if (!categoryName) return { ok: false, message: "Category is required." };
  if (!Number.isFinite(price) || price < 0) return { ok: false, message: "Price must be zero or higher." };
  if (!Number.isInteger(quantity) || quantity < 0) return { ok: false, message: "Starting quantity must be zero or higher." };
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

  return {
    ok: true,
    message: `${title} was added with ${images.length} photo${images.length === 1 ? "" : "s"} and ${quantity} item${quantity === 1 ? "" : "s"} on hand.`,
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
  await admin.from("notifications").insert({
    type: "restock_request",
    product_id: productId,
    customer_id: actor?.role === "customer" ? actor.id : null,
    payload: {
      label: customer
        ? `${customer.displayName} requested a restock check for ${product.title}.`
        : `Restock request received for ${product.title}.`,
    },
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

  const { error } = await admin.from("notifications").insert({
    type: "customer_message",
    customer_id: actor.id,
    payload: {
      label: `${customer.displayName}: ${trimmedMessage}`,
      message: trimmedMessage,
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

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

  const { error } = await admin.from("notifications").insert({
    type: "customer_item_request",
    customer_id: actor.id,
    payload: {
      label: `${customer.displayName} requested help finding an item: ${preview}`,
      request: trimmedRequest,
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

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

  await admin.from("notifications").insert({ type: "shipment_request", customer_id: actor.id, payload: { label: `${customer.displayName} requested shipment confirmation.` } });
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

  await admin.from("notifications").insert({
    type: "shipment_request",
    customer_id: customerId,
    payload: { label: `${customer.displayName} was added to the shipment queue by admin.` },
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
) {
  const admin = await getAdminClient();
  const { data: shipment, error } = await admin.from("shipments").select("id, customer_id, cycle_id, shipping_invoice").eq("id", shipmentId).single();
  if (error || !shipment) return { ok: false, message: "Shipment record not found." };

  const trimmedShippingInvoice = shippingInvoice.trim();
  const previousShippingAmount = parseShippingInvoiceAmount(shipment.shipping_invoice);
  const nextShippingAmount = parseShippingInvoiceAmount(trimmedShippingInvoice);
  const shipmentDate = nextStatus === "completed" ? siteToday() : null;
  const updateResult = await admin.from("shipments").update({
    status: nextStatus,
    tracking_number: trackingNumber.trim() || null,
    shipping_invoice: trimmedShippingInvoice || null,
    shipment_date: shipmentDate,
    completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", shipmentId);
  if (updateResult.error) return { ok: false, message: updateResult.error.message };

  if (shipment.cycle_id) {
    const shippingDelta = (nextShippingAmount ?? 0) - (previousShippingAmount ?? 0);
    if (shippingDelta !== 0) {
      const { data: cycle, error: cycleError } = await admin
        .from("balance_cycles")
        .select("id, shipping_total")
        .eq("id", shipment.cycle_id)
        .single();

      if (cycleError || !cycle) {
        return { ok: false, message: cycleError?.message ?? "Balance cycle not found for shipment." };
      }

      const nextShippingTotal = Math.max(0, Number(cycle.shipping_total ?? 0) + shippingDelta);
      const cycleUpdate = await admin
        .from("balance_cycles")
        .update({ shipping_total: nextShippingTotal, updated_at: new Date().toISOString() })
        .eq("id", shipment.cycle_id);

      if (cycleUpdate.error) {
        return { ok: false, message: cycleUpdate.error.message };
      }
    }
  }

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
  const { data: item, error } = await admin.from("balance_line_items").select("id, description, quantity, item_type, product_id").eq("id", claimId).single();
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
  return { ok: true, message: `${item.description} was updated.` };
}

export async function removeClaimedItemFromDatabaseSupabase(claimId: string) {
  const admin = await getAdminClient();
  const { data: item, error } = await admin.from("balance_line_items").select("id, description, quantity, item_type, product_id").eq("id", claimId).single();
  if (error || !item) return { ok: false, message: "Claimed item not found." };

  if (item.item_type === "claim" && item.product_id) {
    const { data: product } = await admin.from("products").select("inventory_quantity").eq("id", item.product_id).single();
    const nextQuantity = Number(product?.inventory_quantity ?? 0) + Number(item.quantity ?? 0);
    await admin.from("products").update({ inventory_quantity: nextQuantity, updated_at: new Date().toISOString() }).eq("id", item.product_id);
  }

  const removeResult = await admin.from("balance_line_items").delete().eq("id", claimId);
  if (removeResult.error) return { ok: false, message: removeResult.error.message };
  return { ok: true, message: `${item.description} was removed from the active balance.` };
}

export async function applyBalanceAdjustmentsToDatabaseSupabase(shippingChange: number, adjustmentChange: number, customerId?: string) {
  const context = await getTargetCycleContext(customerId, { ensureIfMissing: Boolean(customerId) });
  if (!context) return { ok: false, message: "No active balance cycle is available for admin adjustments yet." };

  const nextShipping = Number(context.cycle.shipping_total ?? 0) + shippingChange;
  const nextAdjustments = Number(context.cycle.adjustments_total ?? 0) + adjustmentChange;
  if (nextShipping < 0) return { ok: false, message: "Shipping total cannot go below zero." };

  const admin = await getAdminClient();
  const { error } = await admin.from("balance_cycles").update({ shipping_total: nextShipping, adjustments_total: nextAdjustments, updated_at: new Date().toISOString() }).eq("id", context.cycle.id);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Balance charges were updated." };
}

export async function applyPaymentToDatabaseSupabase(paymentAmount: number, creditAmount: number, recordedAt?: string, customerId?: string) {
  const normalizedRecordedAt = normalizeRecordedAt(recordedAt);
  if (recordedAt && !normalizedRecordedAt) return { ok: false, message: "Enter a valid record date." };
  const context = await getTargetCycleContext(customerId, {
    dueDate: dueDateForReferenceDate(normalizedRecordedAt?.date),
    ensureIfMissing: Boolean(customerId),
  });
  if (!context) return { ok: false, message: "No active balance cycle is available for payment." };
  if (paymentAmount < 0 || creditAmount < 0) return { ok: false, message: "Payment and credit amounts must be zero or higher." };

  const customer = await getCustomerSummaryByUserId(context.cycle.customer_id, { admin: true });
  const due = context.summary.subtotal + context.summary.shipping + context.summary.adjustments - context.summary.paymentsApplied - context.summary.creditsApplied;
  const applicableCredit = Math.min(creditAmount, customer.creditBalance, Math.max(due - paymentAmount, 0));
  const preview = applyPaymentToBalance(due, paymentAmount, applicableCredit);
  const admin = await getAdminClient();

  const cycleUpdate = await admin.from("balance_cycles").update({ payments_applied: Number(context.cycle.payments_applied ?? 0) + paymentAmount, credits_applied: Number(context.cycle.credits_applied ?? 0) + applicableCredit, updated_at: new Date().toISOString() }).eq("id", context.cycle.id);
  if (cycleUpdate.error) return { ok: false, message: cycleUpdate.error.message };

  if (paymentAmount > 0) {
    await admin.from("payments").insert({
      cycle_id: context.cycle.id,
      amount: paymentAmount,
      notes: "Admin-applied payment",
      ...(normalizedRecordedAt ? { created_at: normalizedRecordedAt.timestamp } : {}),
    });
  }
  if (applicableCredit > 0) await admin.from("credits").insert({ customer_id: context.cycle.customer_id, amount: -applicableCredit, reason: "Applied to active balance cycle" });

  const nextCreditBalance = Math.max(customer.creditBalance - applicableCredit, 0) + preview.overpayment;
  await admin.from("customer_profiles").update({ credit_balance: nextCreditBalance }).eq("user_id", context.cycle.customer_id);
  if (preview.overpayment > 0) await admin.from("credits").insert({ customer_id: context.cycle.customer_id, amount: preview.overpayment, reason: "Overpayment credit" });

  if (shouldArchiveBalance(preview.remaining)) {
    const total = context.summary.subtotal + context.summary.shipping + context.summary.adjustments;
    await admin.from("archived_invoices").insert({
      cycle_id: context.cycle.id,
      customer_id: context.cycle.customer_id,
      cycle_label: formatCycleLabel(normalizedRecordedAt ? new Date(normalizedRecordedAt.timestamp) : new Date()),
      paid_at: normalizedRecordedAt?.date ?? siteToday(),
      total,
      payment_total: Number(context.cycle.payments_applied ?? 0) + paymentAmount,
      credit_applied: Number(context.cycle.credits_applied ?? 0) + applicableCredit,
      status: "archived",
    });
    await admin.from("balance_cycles").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", context.cycle.id);
    await admin.from("balance_cycles").insert({ customer_id: context.cycle.customer_id, status: "active", due_date: nextDueDateFromToday(), shipping_total: 0, adjustments_total: 0, payments_applied: 0, credits_applied: 0 });
  }

  return {
    ok: true,
    message: shouldArchiveBalance(preview.remaining) ? "Payment applied and the balance cycle was archived." : "Payment applied to the active balance cycle.",
    remainingBalance: Math.max(preview.remaining, 0),
    overpayment: preview.overpayment,
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
}) {
  const admin = await getAdminClient();
  const title = input.title.trim();
  const description = input.description.trim();
  const platform = input.platform.trim();
  const externalLink = input.externalLink.trim();
  const timeZone = input.timeZone.trim() || "America/New_York";

  if (!title) return { ok: false, message: "Event title is required." };
  if (!input.startsAtLocal) return { ok: false, message: "Event date and time are required." };

  const startsAt = zonedLocalDateTimeToIso(input.startsAtLocal, timeZone);
  const { error } = await admin.from("events").insert({
    title,
    starts_at: startsAt,
    description,
    external_link: externalLink || null,
    platform: platform || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: `${title} was added to the events calendar.` };
}
