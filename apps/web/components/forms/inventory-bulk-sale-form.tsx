"use client";

import { useActionState, useMemo, useState } from "react";
import type { FormActionState, Product } from "@fatguydiscounts/types";
import { updateProductSalesBulkAction } from "../../app/actions/inventory/bulk-sale";

const initialState: FormActionState = {
  ok: true,
  message: "Choose the items for the sale, then apply either one sale percent or one target sale price and end date to all of them at once.",
};

export function InventoryBulkSaleForm({
  products,
}: {
  products: Product[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [state, formAction, isPending] = useActionState(updateProductSalesBulkAction, initialState);

  const selectedCount = selectedIds.length;
  const allVisibleIds = useMemo(() => products.map((product) => product.id), [products]);

  function toggleProduct(productId: string) {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function selectAll() {
    setSelectedIds(allVisibleIds);
  }

  function clearAll() {
    setSelectedIds([]);
  }

  return (
    <form action={formAction} style={{ display: "grid", gap: 14 }}>
      {selectedIds.map((productId) => (
        <input key={productId} type="hidden" name="productIds" value={productId} />
      ))}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <strong>Selected items</strong>
          <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>{selectedCount} item{selectedCount === 1 ? "" : "s"} selected</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={selectAll}
            style={{ background: "rgba(255,255,255,0.82)", border: "1px solid #d9c7b2", borderRadius: 999, padding: "10px 14px", fontWeight: 700 }}
          >
            Select All Visible
          </button>
          <button
            type="button"
            onClick={clearAll}
            style={{ background: "rgba(255,255,255,0.82)", border: "1px solid #d9c7b2", borderRadius: 999, padding: "10px 14px", fontWeight: 700 }}
          >
            Clear Selection
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Sale percent</span>
          <input
            name="salePercentage"
            type="number"
            min="0.01"
            max="99.99"
            step="0.01"
            defaultValue="10"
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
            style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }}
          />
        </label>
      </div>

      <p style={{ margin: 0, color: "#6d655d", fontSize: 13 }}>
        If you enter a target sale price, each selected item will get its own matching discount percentage automatically.
      </p>

      <div style={{ maxHeight: 280, overflowY: "auto", display: "grid", gap: 8, paddingRight: 4 }}>
        {products.map((product) => {
          const checked = selectedIds.includes(product.id);
          return (
            <label
              key={product.id}
              style={{
                display: "grid",
                gap: 4,
                padding: 12,
                borderRadius: 14,
                border: checked ? "1px solid #bb4d00" : "1px solid rgba(232,214,195,0.88)",
                background: checked ? "rgba(255, 242, 232, 0.95)" : "rgba(255,255,255,0.7)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleProduct(product.id)}
                  style={{ marginTop: 3 }}
                />
                <div style={{ display: "grid", gap: 2 }}>
                  <strong>{product.title}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>
                    {product.category} • ${product.originalPrice.toFixed(2)} • Qty {product.quantity}
                    {product.isOnSale && product.saleEndsAt ? ` • On sale through ${product.saleEndsAt.slice(0, 10)}` : ""}
                  </span>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          disabled={isPending}
          style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "10px 14px", fontWeight: 700 }}
        >
          {isPending ? "Starting Sale..." : "Start New Sale"}
        </button>
        <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
      </div>
    </form>
  );
}
