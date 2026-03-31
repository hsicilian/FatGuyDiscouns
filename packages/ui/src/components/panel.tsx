const palette = {
  panel: "#fffaf3",
  line: "#e8d6c3",
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
      }}
    >
      {children}
    </div>
  );
}

