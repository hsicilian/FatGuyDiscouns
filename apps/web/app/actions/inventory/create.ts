"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { createInventoryItem } from "../../../lib/actions/server";

export async function createInventoryItemAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const files = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  return createInventoryItem(
    String(formData.get("title") ?? ""),
    String(formData.get("description") ?? ""),
    Number(formData.get("price") ?? 0),
    Number(formData.get("quantity") ?? 0),
    String(formData.get("category") ?? ""),
    String(formData.get("sku") ?? ""),
    String(formData.get("location") ?? ""),
    files,
  );
}
