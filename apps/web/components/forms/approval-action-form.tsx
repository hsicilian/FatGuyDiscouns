"use client";

import { useActionState } from "react";
import { updateApprovalStateAction } from "../../app/actions/approvals/update";

const initialState = {
  ok: true,
  message: "Choose an approval action.",
};

export function ApprovalActionForm({ customerId }: { customerId: string }) {
  const [state, formAction, isPending] = useActionState(updateApprovalStateAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 10 }}>
      <input type="hidden" name="customerId" value={customerId} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button name="nextState" value="approved" disabled={isPending} style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "12px 16px" }}>Approve</button>
        <button name="nextState" value="claiming_disabled" disabled={isPending} style={{ background: "transparent", color: "#1f1d1a", border: "1px solid #d9c7b2", borderRadius: 999, padding: "12px 16px" }}>Disable Claiming</button>
        <button name="nextState" value="banned" disabled={isPending} style={{ background: "transparent", color: "#1f1d1a", border: "1px solid #d9c7b2", borderRadius: 999, padding: "12px 16px" }}>Ban</button>
      </div>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}