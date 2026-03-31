"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { createInventoryItemAction } from "../../app/actions/inventory/create";

const initialState: FormActionState = {
  ok: true,
  message: "Add a new item to make it available in the shop right away.",
};

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid #d9c7b2",
  background: "rgba(255,255,255,0.95)",
};

export function InventoryCreateForm() {
  const [state, formAction, isPending] = useActionState(createInventoryItemAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Item title</span>
          <input name="title" required style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Category</span>
          <input name="category" required style={inputStyle} placeholder="Outerwear, Denim, Tees..." />
        </label>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Description</span>
        <textarea name="description" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Price</span>
          <input name="price" type="number" min="0" step="0.01" defaultValue="0" required style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Starting quantity</span>
          <input name="quantity" type="number" min="0" step="1" defaultValue="1" required style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>SKU</span>
          <input name="sku" style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Storage location</span>
          <input name="location" style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button disabled={isPending} style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "12px 18px", fontWeight: 700 }}>
          {isPending ? "Saving..." : "Add Inventory Item"}
        </button>
        <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
      </div>
    </form>
  );
}
