"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { updateProductSalesBulk } from "../../../lib/actions/server";

export async function updateProductSalesBulkAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const productIds = formData
    .getAll("productIds")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  const salePercentage = Number(formData.get("salePercentage") ?? 0);
  const saleEndsAt = String(formData.get("saleEndsAt") ?? "");

  return updateProductSalesBulk(productIds, salePercentage, saleEndsAt);
}
