"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { updateCurrentCustomerProfileDetails } from "../../../lib/actions/server";

export async function updateCustomerProfileAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const street = String(formData.get("street") ?? "");
  const city = String(formData.get("city") ?? "");
  const region = String(formData.get("region") ?? "");
  const postalCode = String(formData.get("postalCode") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const timezone = String(formData.get("timezone") ?? "");
  return updateCurrentCustomerProfileDetails(street, city, region, postalCode, phone, timezone);
}
