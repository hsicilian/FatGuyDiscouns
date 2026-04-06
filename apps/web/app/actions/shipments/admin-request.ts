"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { addCustomerToShipmentQueue } from "../../../lib/actions/server";

export async function addCustomerToShipmentQueueAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const customerId = String(formData.get("customerId") ?? "");
  return addCustomerToShipmentQueue(customerId);
}
