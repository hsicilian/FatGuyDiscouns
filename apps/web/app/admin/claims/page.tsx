import { calculateBalanceDue } from "@fatguydiscounts/core";
import { BalanceAdjustmentForm } from "../../../components/forms/balance-adjustment-form";
import { BalanceLineItemForm } from "../../../components/forms/balance-line-item-form";
import { ManualBalanceItemForm } from "../../../components/forms/manual-balance-item-form";
import { ensureAdminAccess } from "../../../lib/auth/guards";
import { getBalanceCycle, listClaimedItems } from "../../../lib/data/local-db";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function AdminClaimsPage() {
  await ensureAdminAccess();

  const [balanceCycle, claimedItems] = await Promise.all([getBalanceCycle(), listClaimedItems()]);
  const currentTotal = calculateBalanceDue(balanceCycle);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Balance desk</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 10px" }}>Claims and balance adjustments</h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 760, margin: 0 }}>
              Add live-sale items manually, change shipping and adjustment totals, and correct individual line items before taking payment.
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.52)", border: "1px solid rgba(232,214,195,0.9)", borderRadius: 18, padding: 16, minWidth: 220 }}>
            <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Open line items</p>
            <strong style={{ fontSize: "1.9rem" }}>{claimedItems.length}</strong>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 0, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 22, padding: 22, boxShadow: "var(--shadow)" }}>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>
            Current amount due
            {balanceCycle.customerName ? ` for ${balanceCycle.customerName}` : ""}
          </p>
          <h2 style={{ marginBottom: 0 }}>{currency.format(currentTotal)}</h2>
        </div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 22, padding: 22, boxShadow: "var(--shadow)" }}>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>Shipping total</p>
          <h2 style={{ marginBottom: 0 }}>{currency.format(balanceCycle.shipping)}</h2>
        </div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 22, padding: 22, boxShadow: "var(--shadow)" }}>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>Adjustments total</p>
          <h2 style={{ marginBottom: 0 }}>{currency.format(balanceCycle.adjustments)}</h2>
        </div>
      </section>

      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 24 }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
          <h2 style={{ marginTop: 0 }}>Add manual item</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>Use this for live-sale adds that did not come through the customer claim flow.</p>
          <ManualBalanceItemForm />
        </div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
          <h2 style={{ marginTop: 0 }}>Update balance charges</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>Add or subtract shipping and adjustment amounts without editing the raw database.</p>
          <BalanceAdjustmentForm />
        </div>
      </section>

      <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
        {balanceCycle.customerName ? (
          <div style={{ background: "rgba(255,255,255,0.52)", border: "1px solid rgba(232,214,195,0.9)", borderRadius: 18, padding: 16 }}>
            <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Viewing active balance</p>
            <strong>{balanceCycle.customerName}</strong>
            <p style={{ marginBottom: 0, color: "var(--muted)" }}>Due date {balanceCycle.dueDate}</p>
          </div>
        ) : null}
        {claimedItems.map((item) => (
          <section key={item.id} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ marginTop: 0 }}>{item.productTitle}</h2>
                <p style={{ color: "var(--muted)", marginBottom: 0 }}>Qty {item.quantity} | {item.status}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontWeight: 700 }}>{currency.format(item.quantity * item.unitPrice)}</p>
              </div>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(232,214,195,0.88)" }}>
              <BalanceLineItemForm claimId={item.id} quantity={item.quantity} unitPrice={item.unitPrice} />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
