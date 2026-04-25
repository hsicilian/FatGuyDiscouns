"use client";

import { useId, useState } from "react";

export function PasswordInput({
  name,
  placeholder,
  autoComplete,
  defaultValue,
}: {
  name: string;
  placeholder: string;
  autoComplete: string;
  defaultValue?: string;
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
        gap: 8,
        padding: 6,
        borderRadius: 14,
        border: "1px solid #d9c7b2",
        background: "#fff",
      }}
    >
      <input
        id={inputId}
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        style={{ padding: "8px 8px 8px 10px", border: 0, outline: "none", minWidth: 0 }}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-controls={inputId}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{
          border: 0,
          background: "transparent",
          color: "#6d655d",
          fontWeight: 700,
          padding: "8px 10px",
          borderRadius: 999,
          cursor: "pointer",
        }}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
