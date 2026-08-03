"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { createManualCustomer } from "../../../lib/actions/server";

export async function createManualCustomerAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const displayName = String(formData.get("displayName") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const street = String(formData.get("street") ?? "");
  const city = String(formData.get("city") ?? "");
  const region = String(formData.get("region") ?? "");
  const postalCode = String(formData.get("postalCode") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const timezone = String(formData.get("timezone") ?? "");

  return createManualCustomer(
    displayName,
    email,
    password,
    street,
    city,
    region,
    postalCode,
    phone,
    timezone,
  );
}
