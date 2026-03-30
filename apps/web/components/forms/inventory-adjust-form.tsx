"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { adjustInventoryAction } from "../../app/actions/inventory/adjust";

const initialState: FormActionState = {
  ok: true,
  message: "Adjust stock by a positive or negative amount.",
};

export function InventoryAdjustForm({ productId }: { productId: string }) {
  const [state, formAction, isPending] = useActionState(adjustInventoryAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8, width: "100%" }}>
      <input type="hidden" name="productId" value={productId} />
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Qty change</span>
        <input name="quantityChange" type="number" step="1" defaultValue="1" style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
      </label>
      <button disabled={isPending} style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "10px 14px" }}>
        {isPending ? "Saving..." : "Update Stock"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}