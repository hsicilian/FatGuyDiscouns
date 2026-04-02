"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { deleteCrossListedInventory } from "../../../lib/actions/server";

export async function deleteCrossListedInventoryAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const recordId = String(formData.get("recordId") ?? "");
  return deleteCrossListedInventory(recordId);
}
