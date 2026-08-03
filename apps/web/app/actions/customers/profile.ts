"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { updateCustomerProfileDetailsByAdmin } from "../../../lib/actions/server";

export async function updateCustomerProfileByAdminAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const customerId = String(formData.get("customerId") ?? "");
  const street = String(formData.get("street") ?? "");
  const city = String(formData.get("city") ?? "");
  const region = String(formData.get("region") ?? "");
  const postalCode = String(formData.get("postalCode") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const timezone = String(formData.get("timezone") ?? "");

  return updateCustomerProfileDetailsByAdmin(customerId, street, city, region, postalCode, phone, timezone);
}
