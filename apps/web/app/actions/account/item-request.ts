"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { submitCustomerItemRequest } from "../../../lib/actions/server";

export async function sendCustomerItemRequestAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const request = String(formData.get("request") ?? "");
  return submitCustomerItemRequest(request);
}
