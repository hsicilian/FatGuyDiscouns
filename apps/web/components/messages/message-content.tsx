function normalizeUrl(url: string) {
  return url.replace(/[),.!?]+$/, "");
}

export function MessageContent({ message }: { message: string }) {
  const parts = message.split(/(https?:\/\/[^\s]+)/g);

  return (
    <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
      {parts.map((part, index) => {
        if (!part) {
          return null;
        }

        if (/^https?:\/\/[^\s]+$/.test(part)) {
          const href = normalizeUrl(part);
          return (
            <a
              key={`${href}-${index}`}
              href={href}
              style={{ color: "var(--accent-strong)", fontWeight: 700, textDecoration: "underline" }}
            >
              {href}
            </a>
          );
        }

        return <span key={`${index}-${part.slice(0, 10)}`}>{part}</span>;
      })}
    </p>
  );
}
