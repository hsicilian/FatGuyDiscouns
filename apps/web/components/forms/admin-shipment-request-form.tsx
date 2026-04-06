"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { addCustomerToShipmentQueueAction } from "../../app/actions/shipments/admin-request";

const initialState: FormActionState = {
  ok: true,
  message: "Manually add this customer to the shipping queue when you are ready to process an outside paid order.",
};

export function AdminShipmentRequestForm({ customerId, disabled }: { customerId: string; disabled?: boolean }) {
  const [state, formAction, isPending] = useActionState(addCustomerToShipmentQueueAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 10 }}>
      <input type="hidden" name="customerId" value={customerId} />
      <button
        disabled={disabled || isPending}
        style={{
          width: "100%",
          background: disabled ? "#cdb8a1" : "#bb4d00",
          color: "#fff",
          border: 0,
          borderRadius: 999,
          padding: "12px 16px",
        }}
      >
        {isPending ? "Adding..." : "Add To Shipment Queue"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
      {state.nextStatus ? <p style={{ color: "#6d655d", margin: 0 }}>Next status: {state.nextStatus}</p> : null}
    </form>
  );
}
