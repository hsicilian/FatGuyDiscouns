"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { submitShipmentRequestAction } from "../../app/actions/shipments/request";

const initialState: FormActionState = {
  ok: true,
  message: "Confirm the address on file, then request shipment.",
};

export function ShipmentRequestForm({ disabled }: { disabled: boolean }) {
  const [state, formAction, isPending] = useActionState(submitShipmentRequestAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 10 }}>
      <label style={{ display: "flex", gap: 10, alignItems: "start", color: "var(--muted)", lineHeight: 1.5 }}>
        <input type="checkbox" name="addressConfirmed" value="yes" style={{ marginTop: 4 }} />
        <span>I confirm the address on file is correct for this shipment request.</span>
      </label>
      <button
        disabled={disabled || isPending}
        style={{
          background: disabled ? "#cdb8a1" : "#bb4d00",
          color: "#fff",
          border: 0,
          borderRadius: 999,
          padding: "12px 16px",
        }}
      >
        {isPending ? "Submitting..." : "Request Shipment"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
      {state.nextStatus ? <p style={{ color: "#6d655d", margin: 0 }}>Next status: {state.nextStatus}</p> : null}
    </form>
  );
}