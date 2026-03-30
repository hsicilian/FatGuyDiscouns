import { listNotifications } from "../../lib/data/local-db";

export async function NotificationPanel() {
  const notifications = await listNotifications();

  return (
    <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
      <p style={{ marginTop: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12 }}>Alert center</p>
      <h2 style={{ marginTop: 0 }}>Notification center</h2>
      <div style={{ display: "grid", gap: 12 }}>
        {notifications.length > 0 ? notifications.map((notification, index) => (
          <article key={notification.id} style={{ borderTop: index === 0 ? "none" : "1px solid #eedfce", paddingTop: index === 0 ? 0 : 12 }}>
            <p style={{ margin: 0, color: "var(--accent-strong)", textTransform: "uppercase", fontSize: 12, letterSpacing: "0.08em" }}>
              {notification.type.replaceAll("_", " ")}
            </p>
            <strong>{notification.label}</strong>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>{notification.createdAt}</p>
          </article>
        )) : <p style={{ margin: 0, color: "var(--muted)" }}>No admin notifications are active right now.</p>}
      </div>
    </section>
  );
}