"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { addManualBalanceItemAction } from "../../app/actions/balances/manual-item";

const initialState: FormActionState = {
  ok: true,
  message: "Add a manual live-sale line item to the active cycle.",
};

export function ManualBalanceItemForm() {
  const [state, formAction, isPending] = useActionState(addManualBalanceItemAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 10 }}>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Item title</span>
        <input name="title" placeholder="Live sale add-on" style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
      </label>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Quantity</span>
          <input name="quantity" type="number" min="1" step="1" defaultValue="1" style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Unit price</span>
          <input name="unitPrice" type="number" step="0.01" min="0" defaultValue="0" style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
        </label>
      </div>
      <button disabled={isPending} style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "10px 14px" }}>
        {isPending ? "Saving..." : "Add Manual Item"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}