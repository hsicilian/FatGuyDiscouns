"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { removeBalanceLineItem, updateBalanceLineItem } from "../../../lib/actions/server";

export async function updateBalanceLineItemAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const claimId = String(formData.get("claimId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  const unitPrice = Number(formData.get("unitPrice") ?? 0);
  return updateBalanceLineItem(claimId, quantity, unitPrice);
}

export async function removeBalanceLineItemAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const claimId = String(formData.get("claimId") ?? "");
  return removeBalanceLineItem(claimId);
}