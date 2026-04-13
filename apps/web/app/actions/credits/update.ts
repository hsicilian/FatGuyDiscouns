"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { updateCreditSubmission } from "../../../lib/actions/server";

export async function updateCreditAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const creditId = String(formData.get("creditId") ?? "").trim();
  const creditAmount = Number(formData.get("creditAmount") ?? 0);
  const recordedAt = String(formData.get("recordedAt") ?? "").trim() || undefined;
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  return updateCreditSubmission(creditId, creditAmount, recordedAt, reason);
}
