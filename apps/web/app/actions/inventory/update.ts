"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { updateInventoryItem } from "../../../lib/actions/server";

export async function updateInventoryItemAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return updateInventoryItem(
    String(formData.get("productId") ?? ""),
    String(formData.get("title") ?? ""),
    String(formData.get("description") ?? ""),
    Number(formData.get("price") ?? 0),
    Number(formData.get("cost") ?? 0),
    String(formData.get("category") ?? ""),
    String(formData.get("sku") ?? ""),
    String(formData.get("location") ?? ""),
  );
}
