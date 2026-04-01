import {
  accountStateLabel,
  calculateBalanceDue,
  customerGreeting,
  getNextScheduledDueDate,
  isBalanceOverdue,
  shipmentStatusLabel,
} from "@fatguydiscounts/core";
import { CustomerMessageForm } from "../../components/forms/customer-message-form";
import { ProfileForm } from "../../components/forms/profile-form";
import { ShipmentRequestForm } from "../../components/forms/shipment-request-form";
import { previewShipmentRequest } from "../../lib/actions/shipments";
import { ensureCustomerAccess } from "../../lib/auth/guards";
import { getBalanceCycle, getCurrentCustomer, listClaimedItems, listCustomerMessagesForCustomer } from "../../lib/data/local-db";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 18, background: "rgba(255,255,255,0.56)", borderRadius: 20, border: "1px solid rgba(232,214,195,0.85)" }}>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
      <h2 style={{ margin: "8px 0 0" }}>{value}</h2>
    </div>
  );
}

export default async function AccountPage() {
  await ensureCustomerAccess();

  const [balanceCycle, currentCustomer, claimedItems, shipmentPreview] = await Promise.all([
    getBalanceCycle(),
    getCurrentCustomer(),
    listClaimedItems(),
    previewShipmentRequest(),
  ]);
  const recentMessages = await listCustomerMessagesForCustomer(currentCustomer.id, { limit: 5 });
  const recentMessagesForDisplay = [...recentMessages].reverse();
  const amountDue = calculateBalanceDue(balanceCycle);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = isBalanceOverdue(balanceCycle, today);
  const nextRegularDueDate = getNextScheduledDueDate(today);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "36px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, fontWeight: 700 }}>My account</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <h1 style={{ margin: "0 0 8px" }}>{customerGreeting(currentCustomer)}</h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
              Your account is currently marked as <strong>{accountStateLabel(currentCustomer.accountState).toLowerCase()}</strong>.
            </p>
          </div>
          <a href="/account/history" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>View paid history</a>
        </div>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 24 }}>
          <StatCard label={overdue ? "Overdue amount" : "Current balance"} value={currency.format(amountDue)} />
          <StatCard label={overdue ? "Payment status" : "Due date"} value={overdue ? "Due immediately" : balanceCycle.dueDate} />
          <StatCard label={overdue ? "Next regular due date" : "Credit on file"} value={overdue ? nextRegularDueDate : currency.format(currentCustomer.creditBalance)} />
        </div>
        {overdue ? (
          <div style={{ marginTop: 20, padding: 16, borderRadius: 18, background: "#3d1f12", color: "#fff4df", boxShadow: "var(--shadow)" }}>
            <strong>{currency.format(amountDue)}</strong> is overdue and due immediately. Any new claims you make now should be planned around the next regular due date of <strong>{nextRegularDueDate}</strong>.
          </div>
        ) : null}
      </section>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 24, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end", marginBottom: 18 }}>
            <div>
              <p style={{ margin: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, fontWeight: 700 }}>Current claims</p>
              <h2 style={{ margin: "8px 0 0" }}>Items on your open balance</h2>
            </div>
            <span style={{ color: "var(--muted)" }}>{claimedItems.length} item{claimedItems.length === 1 ? "" : "s"}</span>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {claimedItems.length > 0 ? claimedItems.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid #eedfce", paddingTop: 14 }}>
                <div>
                  <strong>{item.productTitle}</strong>
                  <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
                    Qty {item.quantity} · {item.status === "claimed" ? "Claimed" : "Adjusted"}
                  </p>
                </div>
                <strong>{currency.format(item.quantity * item.unitPrice)}</strong>
              </div>
            )) : <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.85)", color: "var(--muted)" }}>You have not claimed anything on your current balance yet.</div>}
          </div>
        </section>

        <aside style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 24, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)", display: "grid", gap: 20 }}>
          <div>
            <p style={{ marginTop: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, fontWeight: 700 }}>Shipping</p>
            <h2 style={{ marginTop: 0 }}>Address and shipment status</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 8 }}>{currentCustomer.address}</p>
            {!currentCustomer.street || !currentCustomer.city || !currentCustomer.region || !currentCustomer.postalCode ? (
              <div style={{ marginBottom: 14, padding: 14, borderRadius: 16, background: "rgba(187,77,0,0.08)", border: "1px solid rgba(187,77,0,0.18)", color: "#8e3200" }}>
                Finish your street address, city, state, zip code, and timezone below before requesting shipment.
              </div>
            ) : null}
            <p style={{ color: "var(--muted)", marginTop: 0 }}>Timezone: {currentCustomer.timezone}</p>
            <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
              <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.85)" }}>
                <p style={{ margin: 0, color: "var(--muted)" }}>Shipment status</p>
                <strong>{shipmentStatusLabel(currentCustomer.shipmentStatus)}</strong>
              </div>
              <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.85)" }}>
                <p style={{ margin: 0, color: "var(--muted)" }}>Last shipment</p>
                <strong>{currentCustomer.lastShipmentDate ?? "No shipment on record yet"}</strong>
              </div>
            </div>
            <ShipmentRequestForm
              disabled={!shipmentPreview.allowed}
              canCancel={currentCustomer.shipmentStatus !== "none" && currentCustomer.shipmentStatus !== "completed"}
            />
          </div>

          <section style={{ paddingTop: 4, borderTop: "1px solid rgba(232,214,195,0.88)" }}>
            <p style={{ marginTop: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, fontWeight: 700 }}>Profile</p>
            <h3 style={{ marginTop: 0 }}>Keep your details up to date</h3>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              Update your shipping address and timezone so deliveries and event times stay accurate.
            </p>
            <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
              <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.85)" }}>
                <p style={{ margin: 0, color: "var(--muted)" }}>Address on file</p>
                <strong>{currentCustomer.address}</strong>
              </div>
              <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.85)" }}>
                <p style={{ margin: 0, color: "var(--muted)" }}>Timezone on file</p>
                <strong>{currentCustomer.timezone}</strong>
              </div>
            </div>
            <ProfileForm
              defaultStreet={currentCustomer.street}
              defaultCity={currentCustomer.city}
              defaultRegion={currentCustomer.region}
              defaultPostalCode={currentCustomer.postalCode}
              defaultTimezone={currentCustomer.timezone}
            />
          </section>

          <section style={{ paddingTop: 4, borderTop: "1px solid rgba(232,214,195,0.88)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <p style={{ marginTop: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, fontWeight: 700 }}>Message admin</p>
                <h3 style={{ marginTop: 0 }}>Need help with your account?</h3>
              </div>
              <a
                href="/account/messages"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 120,
                  padding: "10px 16px",
                  borderRadius: 999,
                  background: "var(--ink)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                }}
              >
                View more
              </a>
            </div>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              Send a note to the admin team here. Replies from admin will show in this thread on your account page.
            </p>
            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              {recentMessagesForDisplay.length > 0 ? recentMessagesForDisplay.map((message) => (
                <div key={message.id} style={{ padding: 12, borderRadius: 16, background: message.senderRole === "admin" ? "rgba(31,29,26,0.08)" : "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.85)" }}>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {message.senderRole === "admin" ? "Admin reply" : "You"}
                  </p>
                  <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{message.message}</p>
                  <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 13 }}>{message.createdAt}</p>
                </div>
              )) : <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.85)", color: "var(--muted)" }}>No messages yet.</div>}
            </div>
            <CustomerMessageForm />
          </section>
        </aside>
      </div>
    </main>
  );
}
