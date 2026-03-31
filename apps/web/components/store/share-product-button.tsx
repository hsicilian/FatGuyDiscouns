"use client";

import { useState } from "react";

export function ShareProductButton({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [message, setMessage] = useState("");

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setMessage("Item link ready to share.");
        return;
      }

      await navigator.clipboard.writeText(url);
      setMessage("Item link copied.");
    } catch {
      setMessage("Could not share this item right now.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button
        type="button"
        onClick={handleShare}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 46,
          padding: "12px 16px",
          borderRadius: 999,
          border: "1px solid var(--line)",
          background: "rgba(255,255,255,0.86)",
          fontWeight: 700,
        }}
      >
        Share Item
      </button>
      <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{message || "Share this listing directly to social media or copy the item link."}</p>
    </div>
  );
}
