"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { deleteCategoryAction } from "../../app/actions/categories/delete";

const initialState: FormActionState = {
  ok: true,
  message: "",
};

export function CategoryDeleteForm({ categoryId }: { categoryId: string }) {
  const [state, formAction, isPending] = useActionState(deleteCategoryAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 6 }}>
      <input type="hidden" name="categoryId" value={categoryId} />
      <button
        disabled={isPending}
        style={{
          border: "1px solid #d9c7b2",
          background: "rgba(255,255,255,0.92)",
          borderRadius: 999,
          padding: "8px 12px",
          fontWeight: 700,
        }}
      >
        {isPending ? "Removing..." : "Remove"}
      </button>
      {state.message ? <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0, fontSize: 12 }}>{state.message}</p> : null}
    </form>
  );
}
