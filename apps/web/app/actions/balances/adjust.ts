"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { applyBalanceAdjustments } from "../../../lib/actions/server";

export async function applyBalanceAdjustmentsAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const shippingChange = Number(formData.get("shippingChange") ?? 0);
  const adjustmentChange = Number(formData.get("adjustmentChange") ?? 0);
  const customerId = String(formData.get("customerId") ?? "").trim() || undefined;
  return applyBalanceAdjustments(shippingChange, adjustmentChange, customerId);
}
