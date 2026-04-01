const palette = {
  panel: "linear-gradient(145deg, rgba(255, 248, 240, 0.98) 0%, rgba(255, 231, 214, 0.94) 56%, rgba(229, 250, 242, 0.92) 100%)",
  line: "#f0c4b5",
};

const spacing = {
  lg: 24,
};

export function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: palette.panel,
        border: `1px solid ${palette.line}`,
        borderRadius: 20,
        padding: spacing.lg,
        boxShadow: "0 14px 34px rgba(226, 118, 92, 0.12)",
      }}
    >
      {children}
    </div>
  );
}

