"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { submitRestockRequestAction } from "../../app/actions/store/restock";

const initialState: FormActionState = {
  ok: true,
  message: "Ask if more of this item can be sourced.",
};

export function RestockRequestForm({ productId }: { productId: string }) {
  const [state, formAction, isPending] = useActionState(submitRestockRequestAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8 }}>
      <input type="hidden" name="productId" value={productId} />
      <button disabled={isPending} style={{ background: "transparent", color: "#1f1d1a", border: "1px solid #d9c7b2", borderRadius: 999, padding: "12px 16px", width: "100%" }}>
        {isPending ? "Sending..." : "Can you get more?"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}