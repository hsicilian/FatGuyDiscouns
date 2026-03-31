import { ensureAdminAccess } from "../../../lib/auth/guards";
import { listNotifications } from "../../../lib/data/local-db";

export default async function AdminNotificationsPage() {
  await ensureAdminAccess();
  const notifications = await listNotifications({ includeRead: true });

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px", display: "grid", gap: 24 }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)" }}>
        <a href="/admin" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Back to admin dashboard</a>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginBottom: 8, fontWeight: 700 }}>Notification history</p>
        <h1 style={{ margin: 0 }}>All notifications</h1>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "grid", gap: 14 }}>
          {notifications.length > 0 ? notifications.map((notification, index) => (
            <article key={notification.id} style={{ borderTop: index === 0 ? "none" : "1px solid #eedfce", paddingTop: index === 0 ? 0 : 14, display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <p style={{ margin: 0, color: "var(--accent-strong)", textTransform: "uppercase", fontSize: 12, letterSpacing: "0.08em" }}>
                  {notification.type.replaceAll("_", " ")}
                </p>
                <span style={{ fontSize: 12, color: notification.readAt ? "var(--muted)" : "#2f5d32", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {notification.readAt ? "Dismissed" : "Active"}
                </span>
              </div>
              <strong>{notification.label}</strong>
              <p style={{ margin: 0, color: "var(--muted)" }}>Created: {notification.createdAt}</p>
              {notification.readAt ? <p style={{ margin: 0, color: "var(--muted)" }}>Dismissed: {notification.readAt}</p> : null}
            </article>
          )) : <p style={{ margin: 0, color: "var(--muted)" }}>No notifications have been created yet.</p>}
        </div>
      </section>
    </main>
  );
}
