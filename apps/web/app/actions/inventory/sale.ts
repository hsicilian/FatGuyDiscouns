"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { clearProductSale, updateProductSale, updateProductSaleByTargetPrice } from "../../../lib/actions/server";

export async function updateProductSaleAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const productId = String(formData.get("productId") ?? "");
  const mode = String(formData.get("mode") ?? "set");

  if (mode === "clear") {
    return clearProductSale(productId);
  }

  const salePercentage = Number(formData.get("salePercentage") ?? 0);
  const salePrice = Number(formData.get("salePrice") ?? 0);
  const saleEndsAt = String(formData.get("saleEndsAt") ?? "");

  if (Number.isFinite(salePrice) && salePrice > 0) {
    return updateProductSaleByTargetPrice(productId, salePrice, saleEndsAt);
  }

  return updateProductSale(productId, salePercentage, saleEndsAt);
}
