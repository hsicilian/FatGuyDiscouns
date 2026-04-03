"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { bulkImportCrossListedInventoryAction } from "../../app/actions/cross-listed/bulk-import";

const initialState: FormActionState = {
  ok: true,
  message: "Upload a CSV with sku, item_name, and platforms columns.",
};

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid #d9c7b2",
  background: "rgba(255,255,255,0.95)",
};

export function CrossListedBulkImportForm() {
  const [state, formAction, isPending] = useActionState(bulkImportCrossListedInventoryAction, initialState);

  return (
    <form action={formAction} encType="multipart/form-data" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Cross listed CSV</span>
        <input
          name="crossListedCsv"
          type="file"
          accept=".csv,text/csv"
          required
          style={{ ...inputStyle, padding: 10 }}
        />
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 16,
          background: "rgba(255,255,255,0.72)",
          border: "1px solid rgba(232,214,195,0.9)",
          color: "var(--muted)",
          lineHeight: 1.7,
        }}
      >
        <strong style={{ display: "block", color: "var(--ink)", marginBottom: 6 }}>CSV header format</strong>
        <code style={{ fontSize: 13 }}>sku,item_name,platforms</code>
        <p style={{ margin: "10px 0 0" }}>
          Use <strong>|</strong> between platforms inside the platforms column.
        </p>
        <code style={{ fontSize: 13 }}>0004,Vintage denim jacket,Ebay|Facebook Marketplace|WN Shop</code>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button disabled={isPending} style={{ background: "#1d1d1d", color: "#fff", border: 0, borderRadius: 999, padding: "12px 18px", fontWeight: 700 }}>
          {isPending ? "Importing..." : "Import CSV"}
        </button>
        <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
      </div>
    </form>
  );
}
