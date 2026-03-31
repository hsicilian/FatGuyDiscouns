"use client";

import { useActionState } from "react";
import type { CSSProperties } from "react";
import { submitClaimAction } from "../../app/actions/claims/submit";

const initialState = {
  ok: true,
  message: "Ready to submit a claim.",
} as const;

export function ClaimSubmitForm({
  productId,
  disabled,
  submitLabel = "Claim Item",
  pendingLabel = "Submitting...",
  disabledLabel = "Unavailable",
  compact = false,
}: {
  productId: string;
  disabled: boolean;
  submitLabel?: string;
  pendingLabel?: string;
  disabledLabel?: string;
  compact?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(submitClaimAction, initialState);
  const formStyle: CSSProperties = compact ? { display: "grid", gap: 8, width: "100%" } : { display: "grid", gap: 10 };

  return (
    <form action={formAction} style={formStyle}>
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
          fontWeight: 700,
        }}
      >
        {isPending ? pendingLabel : disabled ? disabledLabel : submitLabel}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0, fontSize: compact ? 13 : 14 }}>{state.message}</p>
    </form>
  );
}
