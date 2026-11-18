import type { ReactNode } from "react";

/**
 * Linkify URLs in a customer notification's persisted message body.
 * Render as React text + safe anchors; never inject HTML from messages.
 */
export function NotificationMessageLinks({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const urlPattern = /https?:\/\/[^\s<>"'`]+/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlPattern.exec(text)) !== null) {
    const start = match.index;
    const raw = match[0];
    let urlText = raw.replace(/[.,!?;:]+$/, "");

    // Strip trailing closing parentheses not matched by an opening one,
    // e.g. "See (https://example.com/show)".
    while (urlText.endsWith(")")) {
      const opens = (urlText.match(/\(/g) || []).length;
      const closes = (urlText.match(/\)/g) || []).length;
      if (closes <= opens) break;
      urlText = urlText.slice(0, -1);
    }

    // Also strip sentence-closing brackets, without damaging matching URL brackets.
    for (const [close, open] of [["]", "["], ["}", "{"]] as const) {
      while (urlText.endsWith(close)) {
        const opens = urlText.split(open).length - 1;
        const closes = urlText.split(close).length - 1;
        if (closes <= opens) break;
        urlText = urlText.slice(0, -1);
      }
    }
    const trailing = raw.slice(urlText.length);
    parts.push(text.slice(lastIndex, start));
    try {
      const parsed = new URL(urlText);
      if ((parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.hostname && !parsed.username && !parsed.password) {
        parts.push(
          <a
            key={`link-${start}`}
            href={parsed.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline", overflowWrap: "anywhere" }}
          >
            {urlText}
          </a>
        );
      } else {
        parts.push(urlText);
      }
    } catch {
      parts.push(urlText);
    }
    parts.push(trailing);
    lastIndex = start + raw.length;
  }

  parts.push(text.slice(lastIndex));
  return <span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{parts}</span>;
}
