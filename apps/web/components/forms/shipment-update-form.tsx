"use client";

import { useActionState } from "react";
import type { FormActionState, ShipmentStatus } from "@fatguydiscounts/types";
import { updateShipmentAction } from "../../app/actions/shipments/update";

const initialState: FormActionState = {
  ok: true,
  message: "Update shipment status and tracking when ready.",
};

const statuses: ShipmentStatus[] = ["requested", "in_progress", "completed"];

export function ShipmentUpdateForm({
  shipmentId,
  defaultStatus,
  defaultTrackingNumber,
}: {
  shipmentId: string;
  defaultStatus: ShipmentStatus;
  defaultTrackingNumber: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateShipmentAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8, width: "100%" }}>
      <input type="hidden" name="shipmentId" value={shipmentId} />
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Status</span>
        <select name="nextStatus" defaultValue={defaultStatus} style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }}>
          {statuses.map((status) => (
            <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
          ))}
        </select>
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Tracking number</span>
        <input name="trackingNumber" defaultValue={defaultTrackingNumber ?? ""} style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
      </label>
      <button disabled={isPending} style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "10px 14px" }}>
        {isPending ? "Saving..." : "Update Shipment"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}