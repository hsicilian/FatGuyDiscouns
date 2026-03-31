import type { Product } from "@fatguydiscounts/types";

export function slugifyProductTitle(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";
}

export function getProductShortId(id: string) {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toLowerCase();
}

export function getProductSlug(product: Pick<Product, "id" | "title">) {
  return `${slugifyProductTitle(product.title)}--${getProductShortId(product.id)}`;
}

export function getProductPath(product: Pick<Product, "id" | "title">) {
  return `/store/${getProductSlug(product)}`;
}

export function getLookupShortId(lookup: string) {
  const markerIndex = lookup.lastIndexOf("--");
  if (markerIndex === -1) {
    return null;
  }

  const shortId = lookup.slice(markerIndex + 2).trim().toLowerCase();
  return shortId || null;
}

export function productMatchesLookup(productId: string, lookup: string) {
  if (productId === lookup) {
    return true;
  }

  const shortId = getLookupShortId(lookup);
  if (!shortId) {
    return false;
  }

  return getProductShortId(productId) === shortId;
}

export function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
