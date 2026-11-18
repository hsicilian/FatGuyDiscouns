"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InboxNotification } from "../../lib/push/inbox";
import { NotificationMessageLinks } from "./notification-message-links";
export function InboxList({ notifications }: { notifications: InboxNotification[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function remove(id: string) {
    setBusy(id); setError("");
    try {
      const response = await fetch("/api/account/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "delete", id }) });
      if (!response.ok) throw new Error("Could not delete this notification. Please try again.");
      router.refresh();
    } catch (e: any) { setError(e.message); } finally { setBusy(null); }
  }
  return <div style={{ display: "grid", gap: 16 }}>
    {error && <p role="alert">{error}</p>}
    {!notifications.length && <p>No notifications here yet.</p>}
    {notifications.map(n => <article key={n.id} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 20, padding: 20, overflowWrap: "anywhere" }}>
      <h2 style={{ marginTop: 0, fontSize: 20 }}>{n.title}</h2>
      <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}><NotificationMessageLinks text={n.body} /></p>
      {n.kind === "push_failure" && <p><a href="/account#phone-notification-status">Restore phone notifications in Account settings</a></p>}
      <time dateTime={n.created_at} style={{ color: "var(--muted)", fontSize: 14 }}>{new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }).format(new Date(n.created_at))} (Eastern Time)</time>
      <p style={{ marginBottom: 0 }}><button type="button" disabled={busy !== null} aria-label={`Delete notification: ${n.title}`} style={{ minHeight: 44 }} onClick={() => remove(n.id)}>{busy === n.id ? "Deleting..." : "Delete"}</button></p>
    </article>)}
  </div>;
}
