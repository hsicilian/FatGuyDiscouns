"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { previewPaymentSubmission } from "../../../lib/actions/server";

export async function previewPaymentAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const paymentAmount = Number(formData.get("paymentAmount") ?? 0);
  const creditAmount = Number(formData.get("creditAmount") ?? 0);
  return previewPaymentSubmission(paymentAmount, creditAmount);
}