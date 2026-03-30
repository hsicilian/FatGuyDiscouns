"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { submitRestockRequest } from "../../../lib/actions/server";

export async function submitRestockRequestAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const productId = String(formData.get("productId") ?? "");
  return submitRestockRequest(productId);
}