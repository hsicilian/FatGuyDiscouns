"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { cancelShipmentRequestAction } from "../../app/actions/shipments/cancel";

const initialState: FormActionState = {
  ok: true,
  message: "",
};

export function CancelShipmentForm({
  shipmentId,
  submitLabel = "Cancel Request",
}: {
  shipmentId?: string;
  submitLabel?: string;
}) {
  const [state, formAction, isPending] = useActionState(cancelShipmentRequestAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8 }}>
      {shipmentId ? <input type="hidden" name="shipmentId" value={shipmentId} /> : null}
      <button
        disabled={isPending}
        style={{
          background: "rgba(255,255,255,0.92)",
          color: "#1d1d1d",
          border: "1px solid #d9c7b2",
          borderRadius: 999,
          padding: "12px 16px",
          fontWeight: 700,
        }}
      >
        {isPending ? "Canceling..." : submitLabel}
      </button>
      {state.message ? <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p> : null}
    </form>
  );
}
