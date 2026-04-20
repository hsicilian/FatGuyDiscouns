"use server";

import type { FormActionState, ShipmentStatus } from "@fatguydiscounts/types";
import { updateShipment } from "../../../lib/actions/server";

export async function updateShipmentAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const shipmentId = String(formData.get("shipmentId") ?? "");
  const customerId = String(formData.get("customerId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "requested") as ShipmentStatus;
  const trackingNumber = String(formData.get("trackingNumber") ?? "");
  const shippingInvoice = String(formData.get("shippingInvoice") ?? "");
  return updateShipment(shipmentId, nextStatus, trackingNumber, shippingInvoice, customerId);
}
