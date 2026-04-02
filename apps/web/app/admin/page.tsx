import { NotificationPanel } from "../../components/admin/notification-panel";
import { ResetLocalDbForm } from "../../components/forms/reset-local-db-form";
import { ensureAdminAccess } from "../../lib/auth/guards";
import { getCurrentSessionUser } from "../../lib/auth/session";
import { hasSupabaseEnv } from "../../lib/supabase";

const cards = [
  { href: "/admin/approvals", title: "Approvals queue", body: "Review pending accounts, approve customers, disable claiming, and ban users when needed." },
  { href: "/admin/inventory", title: "Inventory management", body: "Track quantity, out-of-stock visibility, low-stock alerts, and restock requests." },
  { href: "/admin/requests", title: "Requests", body: "Review customer sourcing requests and restock requests together in one place." },
  { href: "/admin/customers", title: "Customer CRM", body: "Search customer records, review notes, shipment history, overdue status, and balances." },
  { href: "/admin/claims", title: "Claims and adjustments", body: "Manage claim line items, manual additions, shipping charges, and payment adjustments." },
  { href: "/admin/shipments", title: "Shipment queue", body: "Process requests, add tracking, complete shipments, and update last shipment dates." },
  { href: "/admin/events", title: "Events calendar", body: "Add upcoming live sales, keep the calendar current, and drive shoppers to internal event pages." },
  { href: "/admin/cross-listed", title: "Cross listed inventory", body: "Master-admin-only tracker for the outside platforms each SKU is currently listed on." },
  { href: "/admin/reports", title: "Financial reports", body: "Master-admin-only summaries for unpaid totals and customer balances." },
];

export default async function AdminPage() {
  await ensureAdminAccess();
  const currentUser = await getCurrentSessionUser();
  const isMasterAdmin = currentUser?.role === "master_admin";
  const visibleCards = cards.filter((card) => (
    card.href === "/admin/reports" || card.href === "/admin/cross-listed"
      ? isMasterAdmin
      : true
  ));

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 72px", display: "grid", gap: 24 }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 30, boxShadow: "var(--shadow)" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Admin shell</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0 }}>Operations control center</h1>
          {!hasSupabaseEnv() ? <ResetLocalDbForm /> : null}
        </div>
      </section>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {visibleCards.map((card, index) => (
            <a key={card.href} href={card.href} style={{ background: index === 3 ? "linear-gradient(145deg, rgba(187,77,0,0.94) 0%, rgba(142,50,0,0.98) 100%)" : "var(--panel)", color: index === 3 ? "#fff" : "var(--ink)", border: index === 3 ? "none" : "1px solid var(--line)", borderRadius: 24, padding: 22, minHeight: 172, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
              <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>{card.title}</h2>
              <p style={{ color: index === 3 ? "rgba(255,244,230,0.92)" : "var(--muted)", lineHeight: 1.65, marginBottom: 0 }}>{card.body}</p>
            </a>
          ))}
        </section>
        <NotificationPanel />
      </div>
    </main>
  );
}
