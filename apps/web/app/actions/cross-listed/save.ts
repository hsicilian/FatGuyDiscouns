"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { saveCrossListedInventory } from "../../../lib/actions/server";

export async function saveCrossListedInventoryAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const sku = String(formData.get("sku") ?? "");
  const itemName = String(formData.get("itemName") ?? "");
  const cost = Number(formData.get("cost") ?? 0);
  const platforms = formData.getAll("platforms").map((entry) => String(entry));
  const otherPlatform = String(formData.get("otherPlatform") ?? "").trim();
  const finalPlatforms = otherPlatform ? [...platforms, otherPlatform] : platforms;
  return saveCrossListedInventory(sku, itemName, cost, finalPlatforms);
}
