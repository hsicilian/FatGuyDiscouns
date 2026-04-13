"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { updatePaymentAction } from "../../app/actions/payments/update";

const initialState: FormActionState = {
  ok: true,
  message: "Update a payment if you need to correct the amount or date.",
};

export function PaymentHistoryEditForm({
  paymentId,
  defaultAmount,
  defaultRecordedAt,
}: {
  paymentId: string;
  defaultAmount: number;
  defaultRecordedAt: string;
}) {
  const [state, formAction, isPending] = useActionState(updatePaymentAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8, marginTop: 10 }}>
      <input type="hidden" name="paymentId" value={paymentId} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto", gap: 8, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Payment amount</span>
          <input name="paymentAmount" type="number" min="0" step="0.01" defaultValue={defaultAmount} style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #d9c7b2", boxSizing: "border-box" }} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Record date</span>
          <input name="recordedAt" type="date" defaultValue={defaultRecordedAt} style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #d9c7b2", boxSizing: "border-box" }} />
        </label>
        <button disabled={isPending} style={{ background: "#fff", color: "#2a1f1a", border: "1px solid #d9c7b2", borderRadius: 999, padding: "10px 14px", whiteSpace: "nowrap" }}>
          {isPending ? "Saving..." : "Update Payment"}
        </button>
      </div>
      <p style={{ margin: 0, color: state.ok ? "#2f5d32" : "#8e3200", fontSize: 13 }}>{state.message}</p>
    </form>
  );
}
