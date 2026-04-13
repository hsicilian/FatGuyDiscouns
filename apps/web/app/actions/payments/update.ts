"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { updatePaymentSubmission } from "../../../lib/actions/server";

export async function updatePaymentAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const paymentAmount = Number(formData.get("paymentAmount") ?? 0);
  const recordedAt = String(formData.get("recordedAt") ?? "").trim() || undefined;
  return updatePaymentSubmission(paymentId, paymentAmount, recordedAt);
}
