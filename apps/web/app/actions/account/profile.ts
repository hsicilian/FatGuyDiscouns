"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { updateCurrentCustomerProfileDetails } from "../../../lib/actions/server";

export async function updateCustomerProfileAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const address = String(formData.get("address") ?? "");
  const timezone = String(formData.get("timezone") ?? "");
  return updateCurrentCustomerProfileDetails(address, timezone);
}