"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { addManualBalanceItem } from "../../../lib/actions/server";

export async function addManualBalanceItemAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const title = String(formData.get("title") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  const unitPrice = Number(formData.get("unitPrice") ?? 0);
  const customerId = String(formData.get("customerId") ?? "").trim() || undefined;
  return addManualBalanceItem(title, quantity, unitPrice, customerId);
}
