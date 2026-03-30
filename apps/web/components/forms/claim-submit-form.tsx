"use client";

import { useActionState } from "react";
import { submitClaimAction } from "../../app/actions/claims/submit";

const initialState = {
  ok: true,
  message: "Ready to submit a claim.",
};

export function ClaimSubmitForm({ productId, disabled }: { productId: string; disabled: boolean }) {
  const [state, formAction, isPending] = useActionState(submitClaimAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 10 }}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="requestedQuantity" value="1" />
      <button
        disabled={disabled || isPending}
        style={{
          background: disabled ? "#cdb8a1" : "#bb4d00",
          color: "#fff",
          border: 0,
          borderRadius: 999,
          padding: "12px 16px",
          width: "100%",
        }}
      >
        {isPending ? "Submitting..." : disabled ? "Unavailable" : "Claim Item"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}