"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { createCategoryAction } from "../../app/actions/categories/create";

const initialState: FormActionState = {
  ok: true,
  message: "Add categories here, then select them from the inventory form dropdown.",
};

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid #d9c7b2",
  background: "rgba(255,255,255,0.95)",
};

export function CategoryCreateForm() {
  const [state, formAction, isPending] = useActionState(createCategoryAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>New category name</span>
        <input name="name" required style={inputStyle} placeholder="Outerwear, Dresses, Accessories..." />
      </label>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button disabled={isPending} style={{ background: "#1d1d1d", color: "#fff", border: 0, borderRadius: 999, padding: "12px 18px", fontWeight: 700 }}>
          {isPending ? "Adding..." : "Add Category"}
        </button>
        <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
      </div>
    </form>
  );
}
