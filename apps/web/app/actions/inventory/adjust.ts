"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { adjustInventory } from "../../../lib/actions/server";

export async function adjustInventoryAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const productId = String(formData.get("productId") ?? "");
  const quantityChange = Number(formData.get("quantityChange") ?? 0);
  return adjustInventory(productId, quantityChange);
}