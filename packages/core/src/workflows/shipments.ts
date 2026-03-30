import type { ShipmentStatus } from "@fatguydiscounts/types";

export function nextShipmentStatus(current: ShipmentStatus, action: "request" | "start" | "complete") {
  if (action === "request") {
    return "requested" satisfies ShipmentStatus;
  }

  if (action === "start") {
    return "in_progress" satisfies ShipmentStatus;
  }

  return "completed" satisfies ShipmentStatus;
}

