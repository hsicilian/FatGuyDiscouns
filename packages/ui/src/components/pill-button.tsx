import { palette } from "..";

export function PillButton({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "secondary";
}) {
  return (
    <button
      style={{
        background: tone === "primary" ? palette.accent : "transparent",
        color: tone === "primary" ? "#fff" : palette.ink,
        border: tone === "primary" ? 0 : `1px solid ${palette.line}`,
        borderRadius: 999,
        padding: "12px 16px",
      }}
    >
      {children}
    </button>
  );
}

