"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { submitClaim } from "../../../lib/actions/server";

export async function submitClaimAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const productId = String(formData.get("productId") ?? "");
  const requestedQuantity = Number(formData.get("requestedQuantity") ?? 1);
  return submitClaim(productId, requestedQuantity);
}