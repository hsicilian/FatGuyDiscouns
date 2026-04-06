"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { addManualBalanceItemAction } from "../../app/actions/balances/manual-item";

const initialState: FormActionState = {
  ok: true,
  message: "Add a manual live-sale line item to the active cycle.",
};

export function ManualBalanceItemForm({ customerId }: { customerId?: string }) {
  const [state, formAction, isPending] = useActionState(addManualBalanceItemAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} style={{ display: "grid", gap: 10 }}>
      {customerId ? <input type="hidden" name="customerId" value={customerId} /> : null}
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Item title</span>
        <input name="title" placeholder="Live sale add-on" style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #d9c7b2", boxSizing: "border-box" }} />
      </label>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Quantity</span>
          <input name="quantity" type="number" min="1" step="1" defaultValue="1" style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #d9c7b2", boxSizing: "border-box" }} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Unit price</span>
          <input name="unitPrice" type="number" step="0.01" min="0" defaultValue="0" style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #d9c7b2", boxSizing: "border-box" }} />
        </label>
      </div>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Record date</span>
        <input name="recordedAt" type="date" defaultValue={today} style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #d9c7b2", boxSizing: "border-box" }} />
      </label>
      <button disabled={isPending} style={{ width: "100%", background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "10px 14px" }}>
        {isPending ? "Saving..." : "Add Manual Item"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}
