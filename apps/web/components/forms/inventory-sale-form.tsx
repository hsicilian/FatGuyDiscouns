"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { updateProductSaleAction } from "../../app/actions/inventory/sale";

const initialState: FormActionState = {
  ok: true,
  message: "Set either a sale percent or a target sale price and end date, or clear an active sale.",
};

export function InventorySaleForm({
  productId,
  currentSalePercentage,
  currentSaleEndsAt,
}: {
  productId: string;
  currentSalePercentage: number | null;
  currentSaleEndsAt: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateProductSaleAction, initialState);
  const defaultDate = currentSaleEndsAt ? currentSaleEndsAt.slice(0, 10) : "";

  return (
    <form action={formAction} style={{ display: "grid", gap: 10 }}>
      <input type="hidden" name="productId" value={productId} />
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Sale percent</span>
          <input
            name="salePercentage"
            type="number"
            min="1"
            max="99"
            step="1"
            defaultValue={currentSalePercentage ?? 10}
            style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Target sale price</span>
          <input
            name="salePrice"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Example: 10.00"
            style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Sale ends</span>
          <input
            name="saleEndsAt"
            type="date"
            defaultValue={defaultDate}
            style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }}
          />
        </label>
      </div>

      <p style={{ margin: 0, color: "#6d655d", fontSize: 13 }}>
        If you enter a target sale price, it will be used instead of the sale percent.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          name="mode"
          value="set"
          disabled={isPending}
          style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "10px 14px", fontWeight: 700 }}
        >
          {isPending ? "Saving..." : "Save Sale"}
        </button>
        <button
          name="mode"
          value="clear"
          disabled={isPending}
          style={{ background: "rgba(255,255,255,0.82)", border: "1px solid #d9c7b2", borderRadius: 999, padding: "10px 14px", fontWeight: 700 }}
        >
          Clear Sale
        </button>
      </div>

      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}
