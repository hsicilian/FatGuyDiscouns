"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { submitShipmentRequest } from "../../../lib/actions/server";

export async function submitShipmentRequestAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const addressConfirmed = String(formData.get("addressConfirmed") ?? "") === "yes";
  return submitShipmentRequest(addressConfirmed);
}