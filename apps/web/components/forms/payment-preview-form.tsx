"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { previewPaymentAction } from "../../app/actions/payments/preview";
import { getEasternDateInputValue } from "../../lib/date-format";

const initialState: FormActionState = {
  ok: true,
  message: "Enter payment amounts to apply them to the active balance.",
};

export function PaymentPreviewForm({
  defaultPayment,
  defaultCredit,
  customerId,
}: {
  defaultPayment: number;
  defaultCredit: number;
  customerId?: string;
}) {
  const [state, formAction, isPending] = useActionState(previewPaymentAction, initialState);
  const today = getEasternDateInputValue();

  return (
    <form action={formAction} style={{ display: "grid", gap: 12, width: "100%" }}>
      {customerId ? <input type="hidden" name="customerId" value={customerId} /> : null}
      <label style={{ display: "grid", gap: 6 }}>
        <span>Payment amount</span>
        <input name="paymentAmount" type="number" step="0.01" min="0" defaultValue={defaultPayment} style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d9c7b2", boxSizing: "border-box" }} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>Credit amount</span>
        <input name="creditAmount" type="number" step="0.01" min="0" defaultValue={defaultCredit} style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d9c7b2", boxSizing: "border-box" }} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>Record date</span>
        <input name="recordedAt" type="date" defaultValue={today} style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d9c7b2", boxSizing: "border-box" }} />
      </label>
      <button disabled={isPending} style={{ width: "100%", background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "12px 16px" }}>
        {isPending ? "Applying..." : "Apply Payment"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
      {typeof state.remainingBalance === "number" ? <p style={{ margin: 0, color: "#6d655d" }}>Remaining balance: ${state.remainingBalance.toFixed(2)}</p> : null}
      {typeof state.overpayment === "number" && state.overpayment > 0 ? <p style={{ margin: 0, color: "#6d655d" }}>Overpayment to convert into credit: ${state.overpayment.toFixed(2)}</p> : null}
    </form>
  );
}
