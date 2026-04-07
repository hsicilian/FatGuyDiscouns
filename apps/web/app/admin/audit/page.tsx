import { ensureMasterAdminAccess } from "../../../lib/auth/guards";
import { listAdminAuditEntries } from "../../../lib/data/local-db";

export default async function AdminAuditPage() {
  await ensureMasterAdminAccess();
  const entries = await listAdminAuditEntries(200);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 72px", display: "grid", gap: 20 }}>
      <section style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 24, padding: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12, color: "#8e3200", marginTop: 0 }}>Master admin only</p>
        <h1 style={{ margin: "0 0 10px" }}>Admin audit trail</h1>
        <p style={{ margin: 0, color: "#6d655d", lineHeight: 1.7 }}>
          Review a timestamped history of key admin actions across CRM, inventory, shipping, and events.
        </p>
      </section>

      <section style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 24, padding: 24, display: "grid", gap: 14 }}>
        {entries.length > 0 ? entries.map((entry, index) => (
          <article key={entry.id} style={{ borderTop: index === 0 ? "none" : "1px solid #eedfce", paddingTop: index === 0 ? 0 : 14, display: "grid", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <strong>{entry.summary}</strong>
              <span style={{ color: "#6d655d", fontSize: 14 }}>{entry.createdAt}</span>
            </div>
            <p style={{ margin: 0, color: "#6d655d" }}>
              {entry.actorName} ({entry.actorRole.replaceAll("_", " ")}) • {entry.actionType} • {entry.entityType}
            </p>
            {entry.targetCustomerId ? (
              <p style={{ margin: 0, color: "#6d655d" }}>Customer: {entry.targetCustomerId}</p>
            ) : null}
          </article>
        )) : <p style={{ margin: 0, color: "#6d655d" }}>No admin audit entries have been recorded yet.</p>}
      </section>
    </main>
  );
}
