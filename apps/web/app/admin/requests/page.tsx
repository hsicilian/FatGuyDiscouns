import { ensureAdminAccess } from "../../../lib/auth/guards";
import { listCustomerItemRequests, listRestockRequests } from "../../../lib/data/local-db";

export default async function AdminRequestsPage() {
  await ensureAdminAccess();
  const [itemRequests, restockRequests] = await Promise.all([
    listCustomerItemRequests(),
    listRestockRequests(),
  ]);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px", display: "grid", gap: 24 }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)" }}>
        <a href="/admin" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Back to admin dashboard</a>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginBottom: 8, fontWeight: 700 }}>Requests</p>
        <h1 style={{ margin: 0 }}>Customer requests</h1>
      </section>

      <section style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
          <h2 style={{ marginTop: 0 }}>Item requests</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {itemRequests.length > 0 ? itemRequests.map((request) => (
              <div key={request.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 12, display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>{request.customerName ?? "Customer"}</strong>
                  <span style={{ color: "var(--muted)" }}>{request.createdAt}</span>
                </div>
                <p style={{ margin: 0, color: "var(--muted)" }}>{request.request}</p>
                <a href={`/admin/customers/${request.customerId}`} style={{ color: "var(--accent-strong)", fontWeight: 700 }}>
                  Open CRM record
                </a>
              </div>
            )) : <p style={{ margin: 0, color: "var(--muted)" }}>No item requests yet.</p>}
          </div>
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
          <h2 style={{ marginTop: 0 }}>Restock requests</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {restockRequests.length > 0 ? restockRequests.map((request) => (
              <div key={request.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 12, display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>{request.customerName ?? request.email ?? "Customer"}</strong>
                  <span style={{ color: "var(--muted)" }}>{request.createdAt}</span>
                </div>
                <p style={{ margin: 0 }}><strong>{request.productTitle}</strong></p>
                <p style={{ margin: 0, color: "var(--muted)" }}>Status: {request.status}</p>
                {request.customerId ? (
                  <a href={`/admin/customers/${request.customerId}`} style={{ color: "var(--accent-strong)", fontWeight: 700 }}>
                    Open CRM record
                  </a>
                ) : null}
              </div>
            )) : <p style={{ margin: 0, color: "var(--muted)" }}>No restock requests yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
