import {
  accountStateLabel,
  calculateBalanceDue,
  customerGreeting,
  isBalanceOverdue,
  shipmentStatusLabel,
} from "@fatguydiscounts/core";
import { ProfileForm } from "../../components/forms/profile-form";
import { ShipmentRequestForm } from "../../components/forms/shipment-request-form";
import { previewShipmentRequest } from "../../lib/actions/shipments";
import { ensureCustomerAccess } from "../../lib/auth/guards";
import { getBalanceCycle, getCurrentCustomer, listClaimedItems } from "../../lib/data/local-db";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function AccountPage() {
  await ensureCustomerAccess();

  const [balanceCycle, currentCustomer, claimedItems, shipmentPreview] = await Promise.all([
    getBalanceCycle(),
    getCurrentCustomer(),
    listClaimedItems(),
    previewShipmentRequest(),
  ]);
  const amountDue = calculateBalanceDue(balanceCycle);
  const overdue = isBalanceOverdue(balanceCycle, new Date().toISOString().slice(0, 10));

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Customer dashboard</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <h1 style={{ margin: "0 0 8px" }}>{customerGreeting(currentCustomer)}</h1>
            <p style={{ margin: 0, color: "var(--muted)" }}>Account state: {accountStateLabel(currentCustomer.accountState)}</p>
          </div>
          <a href="/account/history" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>View invoice history</a>
        </div>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 24 }}>
          <div style={{ padding: 18, background: "rgba(255,255,255,0.5)", borderRadius: 20, border: "1px solid rgba(232,214,195,0.85)" }}><p style={{ margin: 0, color: "var(--muted)" }}>Running balance</p><h2 style={{ marginBottom: 0 }}>{currency.format(amountDue)}</h2></div>
          <div style={{ padding: 18, background: "rgba(255,255,255,0.5)", borderRadius: 20, border: "1px solid rgba(232,214,195,0.85)" }}><p style={{ margin: 0, color: "var(--muted)" }}>Due date</p><h2 style={{ marginBottom: 0 }}>{balanceCycle.dueDate}</h2></div>
          <div style={{ padding: 18, background: "rgba(255,255,255,0.5)", borderRadius: 20, border: "1px solid rgba(232,214,195,0.85)" }}><p style={{ margin: 0, color: "var(--muted)" }}>Credit balance</p><h2 style={{ marginBottom: 0 }}>{currency.format(currentCustomer.creditBalance)}</h2></div>
        </div>
        {overdue ? <div style={{ marginTop: 20, padding: 16, borderRadius: 18, background: "#3d1f12", color: "#fff4df", boxShadow: "var(--shadow)" }}>Your balance is overdue. This warning appears when an unpaid cycle is past due.</div> : null}
      </section>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 24, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end", marginBottom: 18 }}>
            <div>
              <p style={{ margin: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12 }}>Open cycle</p>
              <h2 style={{ margin: "8px 0 0" }}>Current claimed items</h2>
            </div>
            <span style={{ color: "var(--muted)" }}>{claimedItems.length} item{claimedItems.length === 1 ? "" : "s"}</span>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {claimedItems.length > 0 ? claimedItems.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid #eedfce", paddingTop: 14 }}>
                <div>
                  <strong>{item.productTitle}</strong>
                  <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>Qty {item.quantity} | {item.status}</p>
                </div>
                <strong>{currency.format(item.quantity * item.unitPrice)}</strong>
              </div>
            )) : <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.85)", color: "var(--muted)" }}>No claimed items are on the active cycle yet.</div>}
          </div>
        </section>

        <aside style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 24, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)", display: "grid", gap: 20 }}>
          <div>
            <p style={{ marginTop: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12 }}>Shipping desk</p>
            <h2 style={{ marginTop: 0 }}>Shipping and address</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 8 }}>{currentCustomer.address}</p>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>Timezone: {currentCustomer.timezone}</p>
            <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
              <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.85)" }}>
                <p style={{ margin: 0, color: "var(--muted)" }}>Shipment status</p>
                <strong>{shipmentStatusLabel(currentCustomer.shipmentStatus)}</strong>
              </div>
              <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.85)" }}>
                <p style={{ margin: 0, color: "var(--muted)" }}>Last shipment</p>
                <strong>{currentCustomer.lastShipmentDate ?? "No prior shipment"}</strong>
              </div>
            </div>
            <ShipmentRequestForm disabled={!shipmentPreview.allowed} />
          </div>

          <section style={{ paddingTop: 4, borderTop: "1px solid rgba(232,214,195,0.88)" }}>
            <p style={{ marginTop: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12 }}>Profile details</p>
            <h3 style={{ marginTop: 0 }}>Update address and timezone</h3>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              Keep this current so shipment requests and event timing stay aligned with the right customer details.
            </p>
            <ProfileForm defaultAddress={currentCustomer.address} defaultTimezone={currentCustomer.timezone} />
          </section>
        </aside>
      </div>
    </main>
  );
}