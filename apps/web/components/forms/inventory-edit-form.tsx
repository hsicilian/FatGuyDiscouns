"use client";

import { useActionState } from "react";
import type { CategoryOption, FormActionState } from "@fatguydiscounts/types";
import { updateInventoryItemAction } from "../../app/actions/inventory/update";

const initialState: FormActionState = {
  ok: true,
  message: "Update the listing details for this inventory item.",
};

const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 12,
  border: "1px solid #d9c7b2",
  background: "rgba(255,255,255,0.95)",
};

export function InventoryEditForm({
  productId,
  title,
  description,
  price,
  cost,
  category,
  sku,
  location,
  categories,
}: {
  productId: string;
  title: string;
  description: string;
  price: number;
  cost: number | null | undefined;
  category: string;
  sku: string | null | undefined;
  location: string | null | undefined;
  categories: CategoryOption[];
}) {
  const [state, formAction, isPending] = useActionState(updateInventoryItemAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 10 }}>
      <input type="hidden" name="productId" value={productId} />

      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Item title</span>
        <input name="title" defaultValue={title} required style={inputStyle} />
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Description</span>
        <textarea name="description" defaultValue={description} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Price</span>
          <input name="price" type="number" min="0" step="0.01" defaultValue={price.toFixed(2)} required style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Cost</span>
          <input name="cost" type="number" min="0" step="0.01" defaultValue={Number(cost ?? 0).toFixed(2)} required style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Category</span>
          <select name="category" defaultValue={category} required style={inputStyle}>
            {categories.map((entry) => (
              <option key={entry.id} value={entry.name}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>SKU</span>
          <input name="sku" defaultValue={sku ?? ""} required style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Storage location</span>
          <input name="location" defaultValue={location ?? ""} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          disabled={isPending}
          style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "10px 14px", fontWeight: 700 }}
        >
          {isPending ? "Saving..." : "Save Listing Changes"}
        </button>
        <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
      </div>
    </form>
  );
}
