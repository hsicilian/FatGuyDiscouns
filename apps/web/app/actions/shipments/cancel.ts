"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { cancelShipmentRequest } from "../../../lib/actions/server";

export async function cancelShipmentRequestAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const shipmentId = String(formData.get("shipmentId") ?? "").trim() || undefined;
  return cancelShipmentRequest(shipmentId);
}
