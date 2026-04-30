"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { updateProductSalesBulk, updateProductSalesBulkByTargetPrice } from "../../../lib/actions/server";

export async function updateProductSalesBulkAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const productIds = formData
    .getAll("productIds")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  const salePercentage = Number(formData.get("salePercentage") ?? 0);
  const salePrice = Number(formData.get("salePrice") ?? 0);
  const saleEndsAt = String(formData.get("saleEndsAt") ?? "");

  if (Number.isFinite(salePrice) && salePrice > 0) {
    return updateProductSalesBulkByTargetPrice(productIds, salePrice, saleEndsAt);
  }

  return updateProductSalesBulk(productIds, salePercentage, saleEndsAt);
}
