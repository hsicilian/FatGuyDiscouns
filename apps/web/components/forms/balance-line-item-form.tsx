"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import {
  removeBalanceLineItemAction,
  updateBalanceLineItemAction,
} from "../../app/actions/balances/line-item";

const updateInitialState: FormActionState = {
  ok: true,
  message: "Update quantity or price for this line item.",
};

const removeInitialState: FormActionState = {
  ok: true,
  message: "Remove this line item if it should not be on the active balance.",
};

export function BalanceLineItemForm({
  claimId,
  quantity,
  unitPrice,
}: {
  claimId: string;
  quantity: number;
  unitPrice: number;
}) {
  const [updateState, updateAction, updatePending] = useActionState(updateBalanceLineItemAction, updateInitialState);
  const [removeState, removeAction, removePending] = useActionState(removeBalanceLineItemAction, removeInitialState);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <form action={updateAction} style={{ display: "grid", gap: 8 }}>
        <input type="hidden" name="claimId" value={claimId} />
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ color: "#6d655d", fontSize: 13 }}>Qty</span>
            <input name="quantity" type="number" min="1" step="1" defaultValue={quantity} style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ color: "#6d655d", fontSize: 13 }}>Unit price</span>
            <input name="unitPrice" type="number" step="0.01" min="0" defaultValue={unitPrice} style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
          </label>
        </div>
        <button disabled={updatePending || removePending} style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "10px 14px" }}>
          {updatePending ? "Saving..." : "Update Item"}
        </button>
        <p style={{ color: updateState.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{updateState.message}</p>
      </form>
      <form action={removeAction}>
        <input type="hidden" name="claimId" value={claimId} />
        <button disabled={updatePending || removePending} style={{ background: "transparent", color: "#1f1d1a", border: "1px solid #d9c7b2", borderRadius: 999, padding: "10px 14px", width: "100%" }}>
          {removePending ? "Removing..." : "Remove Item"}
        </button>
        <p style={{ color: removeState.ok ? "#2f5d32" : "#8e3200", margin: "8px 0 0" }}>{removeState.message}</p>
      </form>
    </div>
  );
}