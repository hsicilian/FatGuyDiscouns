"use client";

import { useActionState, useRef, useState } from "react";
import type { CategoryOption, FormActionState } from "@fatguydiscounts/types";
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

export function InventoryCreateForm({ categories }: { categories: CategoryOption[] }) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, formAction, isPending] = useActionState(createInventoryItemAction, initialState);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length === 0) {
      return;
    }

    setSelectedFiles((current) => {
      const merged = [...current];

      for (const file of nextFiles) {
        const alreadyIncluded = merged.some(
          (existing) =>
            existing.name === file.name
            && existing.size === file.size
            && existing.lastModified === file.lastModified,
        );

        if (!alreadyIncluded) {
          merged.push(file);
        }
      }

      return merged.slice(0, 6);
    });

    event.target.value = "";
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }

  return (
    <form
      action={async (formData) => {
        selectedFiles.forEach((file) => formData.append("images", file));
        await formAction(formData);
      }}
      style={{ display: "grid", gap: 14 }}
      encType="multipart/form-data"
    >
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Item title</span>
          <input name="title" required style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Category</span>
          <select name="category" required style={inputStyle} defaultValue={categories[0]?.name ?? ""}>
            {categories.length > 0 ? (
              categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))
            ) : (
              <option value="">Add a category first</option>
            )}
          </select>
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

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Item photos</span>
        <input
          ref={fileInputRef}
          name="images"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          style={{ ...inputStyle, padding: 10 }}
        />
        <span style={{ color: "#6d655d", fontSize: 13 }}>
          Add up to 6 images. You can choose several at once or add them one at a time before saving.
        </span>
        {selectedFiles.length > 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}-${index}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid #e1d3c0",
                  background: "rgba(255,255,255,0.85)",
                }}
              >
                <span style={{ color: "#6d655d", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeSelectedFile(index)}
                  style={{
                    border: "1px solid #d9c7b2",
                    background: "rgba(255,255,255,0.92)",
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontWeight: 700,
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </label>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button disabled={isPending} style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "12px 18px", fontWeight: 700 }}>
          {isPending ? "Saving..." : "Add Inventory Item"}
        </button>
        <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
      </div>
    </form>
  );
}
