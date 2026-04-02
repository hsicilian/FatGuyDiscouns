"use client";

import { useActionState } from "react";
import type { CrossListedPlatform, FormActionState } from "@fatguydiscounts/types";
import { saveCrossListedInventoryAction } from "../../app/actions/cross-listed/save";

const PLATFORM_OPTIONS: CrossListedPlatform[] = [
  "Ebay",
  "Poshmark",
  "Mercari",
  "Facebook Marketplace",
  "Website",
  "WN Shop",
];

const initialState: FormActionState = {
  ok: true,
  message: "Add a SKU, item name, and the platforms where the item is listed.",
};

export function CrossListedInventoryForm() {
  const [state, formAction, isPending] = useActionState(saveCrossListedInventoryAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>SKU</span>
          <input
            name="sku"
            type="text"
            placeholder="0004"
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d9c7b2" }}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>Item name</span>
          <input
            name="itemName"
            type="text"
            placeholder="Vintage denim jacket"
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d9c7b2" }}
          />
        </label>
      </div>

      <fieldset style={{ margin: 0, padding: 0, border: "none", display: "grid", gap: 10 }}>
        <legend style={{ padding: 0, color: "var(--muted)", fontSize: 14 }}>Platforms</legend>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {PLATFORM_OPTIONS.map((platform) => (
            <label
              key={platform}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(232,214,195,0.88)",
                background: "rgba(255,255,255,0.56)",
              }}
            >
              <input type="checkbox" name="platforms" value={platform} />
              <span>{platform}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button disabled={isPending} style={{ width: "100%", background: "#1f1d1a", color: "#fff", border: 0, borderRadius: 999, padding: "12px 16px", fontWeight: 700 }}>
        {isPending ? "Saving..." : "Save Cross Listed Item"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}
