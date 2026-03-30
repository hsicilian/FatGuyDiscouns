import { canRequestShipment, nextShipmentStatus } from "@fatguydiscounts/core";
import { getCurrentCustomer } from "../data/local-db";

export async function previewShipmentRequest() {
  const customer = await getCurrentCustomer();
  const allowed = canRequestShipment(customer.accountState, customer.shipmentStatus);

  return {
    allowed,
    nextStatus: allowed ? nextShipmentStatus(customer.shipmentStatus, "request") : customer.shipmentStatus,
  };
}