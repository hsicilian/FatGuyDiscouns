import { ensureCustomerAccess } from "../../../lib/auth/guards";
import { listArchivedInvoices } from "../../../lib/data/local-db";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function AccountHistoryPage() {
  await ensureCustomerAccess();
  const archivedInvoices = await listArchivedInvoices();

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "36px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, fontWeight: 700 }}>Paid history</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 12px" }}>Invoice history</h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 760, marginBottom: 0 }}>
              Once a balance is fully paid, it moves here as a completed invoice so you can keep track of past cycles.
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.52)", border: "1px solid rgba(232,214,195,0.9)", borderRadius: 18, padding: 16, width: "min(100%, 220px)" }}>
            <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Completed invoices</p>
            <strong style={{ fontSize: "1.9rem" }}>{archivedInvoices.length}</strong>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gap: 16 }}>
        {archivedInvoices.length > 0 ? archivedInvoices.map((invoice, index) => (
          <section key={invoice.id} style={{ background: index === 0 ? "linear-gradient(145deg, rgba(255, 249, 241, 0.98) 0%, rgba(246, 229, 209, 0.94) 100%)" : "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <p style={{ marginTop: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, fontWeight: 700 }}>Completed cycle</p>
                <h2 style={{ marginTop: 0 }}>{invoice.cycleLabel}</h2>
                <p style={{ color: "var(--muted)", margin: "4px 0" }}>Paid on {invoice.paidAt}</p>
                <p style={{ color: "var(--muted)", marginBottom: 0 }}>Credit applied: {currency.format(invoice.creditApplied)}</p>
              </div>
              <div style={{ width: "min(100%, 220px)", padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.5)", border: "1px solid rgba(232,214,195,0.88)" }}>
                <p style={{ margin: 0, color: "var(--muted)" }}>Invoice total</p>
                <h3 style={{ margin: "6px 0 0" }}>{currency.format(invoice.total)}</h3>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Payments made: {currency.format(invoice.paymentTotal)}</p>
              </div>
            </div>
          </section>
        )) : <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", color: "var(--muted)" }}>Completed invoices will appear here after your first paid balance cycle.</section>}
      </div>
    </main>
  );
}
