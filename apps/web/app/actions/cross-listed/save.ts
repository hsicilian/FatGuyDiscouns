"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { saveCrossListedInventory } from "../../../lib/actions/server";

export async function saveCrossListedInventoryAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const sku = String(formData.get("sku") ?? "");
  const itemName = String(formData.get("itemName") ?? "");
  const platforms = formData.getAll("platforms").map((entry) => String(entry));
  return saveCrossListedInventory(sku, itemName, platforms);
}
