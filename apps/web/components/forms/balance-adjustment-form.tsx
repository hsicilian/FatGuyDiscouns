"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { applyBalanceAdjustmentsAction } from "../../app/actions/balances/adjust";

const initialState: FormActionState = {
  ok: true,
  message: "Adjust shipping and balance modifiers for the active cycle.",
};

export function BalanceAdjustmentForm() {
  const [state, formAction, isPending] = useActionState(applyBalanceAdjustmentsAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Shipping change</span>
          <input name="shippingChange" type="number" step="0.01" defaultValue="0" style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Adjustment change</span>
          <input name="adjustmentChange" type="number" step="0.01" defaultValue="0" style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
        </label>
      </div>
      <button disabled={isPending} style={{ background: "#1f1d1a", color: "#fff", border: 0, borderRadius: 999, padding: "10px 14px" }}>
        {isPending ? "Saving..." : "Apply Balance Changes"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}