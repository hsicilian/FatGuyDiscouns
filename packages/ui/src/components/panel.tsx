import { palette, spacing } from "..";

export function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: palette.panel,
        border: `1px solid ${palette.line}`,
        borderRadius: 20,
        padding: spacing.lg,
      }}
    >
      {children}
    </div>
  );
}

