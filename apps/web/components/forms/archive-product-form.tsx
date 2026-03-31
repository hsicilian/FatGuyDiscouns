"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { manageArchivedProductAction } from "../../app/actions/inventory/archive";

const initialState: FormActionState = {
  ok: true,
  message: "Archive this item to remove it from the live shop.",
};

export function ArchiveProductForm({ productId }: { productId: string }) {
  const [state, formAction, isPending] = useActionState(manageArchivedProductAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8 }}>
      <input type="hidden" name="productId" value={productId} />
      <button
        name="mode"
        value="archive"
        disabled={isPending}
        style={{ background: "#1d1d1d", color: "#fff", border: 0, borderRadius: 999, padding: "10px 14px", fontWeight: 700 }}
      >
        {isPending ? "Archiving..." : "Archive Item"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0, fontSize: 13 }}>{state.message}</p>
    </form>
  );
}
