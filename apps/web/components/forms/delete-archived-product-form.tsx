"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { manageArchivedProductAction } from "../../app/actions/inventory/archive";

const initialState: FormActionState = {
  ok: true,
  message: "",
};

export function DeleteArchivedProductForm({ productId, disabled, helperText }: { productId: string; disabled: boolean; helperText: string }) {
  const [state, formAction, isPending] = useActionState(manageArchivedProductAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8 }}>
      <input type="hidden" name="productId" value={productId} />
      <button
        name="mode"
        value="delete"
        disabled={disabled || isPending}
        style={{ background: disabled ? "#cdb8a1" : "#8e3200", color: "#fff", border: 0, borderRadius: 999, padding: "10px 14px", fontWeight: 700 }}
      >
        {isPending ? "Deleting..." : "Delete Permanently"}
      </button>
      <p style={{ color: state.message ? (state.ok ? "#2f5d32" : "#8e3200") : "var(--muted)", margin: 0, fontSize: 13 }}>
        {state.message || helperText}
      </p>
    </form>
  );
}
