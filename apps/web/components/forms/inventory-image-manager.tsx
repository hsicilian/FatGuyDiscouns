"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProductImageRecord } from "@fatguydiscounts/types";

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid #d9c7b2",
  background: "rgba(255,255,255,0.95)",
};

const buttonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

export function InventoryImageManager({
  productId,
  productTitle,
  currentImages,
}: {
  productId: string;
  productTitle: string;
  currentImages: ProductImageRecord[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<string>("Add or remove photos for this listing.");
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const existingCount = currentImages.length;
  const remainingSlots = Math.max(0, 6 - existingCount);

  const uploadDisabled = useMemo(
    () => isPending || selectedFiles.length === 0 || remainingSlots === 0,
    [isPending, selectedFiles.length, remainingSlots],
  );

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length === 0) {
      return;
    }

    setSelectedFiles((current) => {
      const merged = [...current];
      for (const file of nextFiles) {
        const duplicate = merged.some(
          (existing) =>
            existing.name === file.name
            && existing.size === file.size
            && existing.lastModified === file.lastModified,
        );

        if (!duplicate) {
          merged.push(file);
        }
      }

      return merged.slice(0, remainingSlots);
    });

    event.target.value = "";
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }

  async function handleUpload() {
    if (uploadDisabled) {
      return;
    }

    startTransition(async () => {
      try {
        for (const [index, file] of selectedFiles.entries()) {
          const formData = new FormData();
          formData.append("productId", productId);
          formData.append("position", String(existingCount + index));
          formData.append("file", file);

          const response = await fetch("/api/admin/product-images", {
            method: "POST",
            body: formData,
          });

          const payload = await response.json();
          if (!response.ok || !payload?.ok) {
            throw new Error(payload?.message ?? "Photo upload failed.");
          }
        }

        setSelectedFiles([]);
        setIsError(false);
        setMessage(`Photos updated for ${productTitle}.`);
        router.refresh();
      } catch (error) {
        setIsError(true);
        setMessage(error instanceof Error ? error.message : "Photo upload failed.");
      }
    });
  }

  async function handleDelete(imageId: string) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/product-images?imageId=${encodeURIComponent(imageId)}`, {
          method: "DELETE",
        });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.message ?? "Photo removal failed.");
        }

        setIsError(false);
        setMessage(`Removed a photo from ${productTitle}.`);
        router.refresh();
      } catch (error) {
        setIsError(true);
        setMessage(error instanceof Error ? error.message : "Photo removal failed.");
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <strong>Item photos</strong>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Add photos to bulk-imported listings or swap existing images by removing old ones and uploading new ones here.
        </p>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {currentImages.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {currentImages.map((image, index) => (
              <div
                key={image.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "88px 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: 10,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.82)",
                  border: "1px solid rgba(232,214,195,0.88)",
                }}
              >
                <img
                  src={image.url}
                  alt={`${productTitle} photo ${index + 1}`}
                  style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(232,214,195,0.88)" }}
                />
                <div style={{ display: "grid", gap: 4 }}>
                  <strong style={{ fontSize: 14 }}>Photo {index + 1}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>Shown in position {image.position + 1}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(image.id)}
                  disabled={isPending}
                  style={{
                    ...buttonStyle,
                    background: "rgba(255,255,255,0.94)",
                    color: "#7d2f1f",
                    border: "1px solid #d9c7b2",
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: 14,
              borderRadius: 16,
              background: "rgba(255,255,255,0.72)",
              border: "1px dashed rgba(217,199,178,0.95)",
              color: "var(--muted)",
            }}
          >
            No photos added yet.
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Add more photos</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={remainingSlots === 0 || isPending}
            style={{ ...inputStyle, padding: 10 }}
          />
        </label>
        <span style={{ color: "#6d655d", fontSize: 13 }}>
          {remainingSlots === 0
            ? "This item already has the max 6 photos. Remove one to add a new image."
            : `You can add ${remainingSlots} more photo${remainingSlots === 1 ? "" : "s"} to this item.`}
        </span>
      </div>

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

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploadDisabled}
          style={{
            ...buttonStyle,
            background: uploadDisabled ? "#d9c7b2" : "#bb4d00",
            color: "#fff",
          }}
        >
          {isPending ? "Updating..." : "Upload Selected Photos"}
        </button>
        <p style={{ color: isError ? "#8e3200" : "#2f5d32", margin: 0 }}>{message}</p>
      </div>
    </div>
  );
}
