import { accountStateLabel, calculateBalanceDue, shipmentStatusLabel } from "@fatguydiscounts/core";
import { ApprovalActionForm } from "../../../../components/forms/approval-action-form";
import { BalanceAdjustmentForm } from "../../../../components/forms/balance-adjustment-form";
import { BalanceLineItemForm } from "../../../../components/forms/balance-line-item-form";
import { CustomerMessageReplyForm } from "../../../../components/forms/customer-message-reply-form";
import { CustomerNoteForm } from "../../../../components/forms/customer-note-form";
import { ManualBalanceItemForm } from "../../../../components/forms/manual-balance-item-form";
import { PaymentPreviewForm } from "../../../../components/forms/payment-preview-form";
import { PromoteAdminForm } from "../../../../components/forms/promote-admin-form";
import { ensureAdminAccess } from "../../../../lib/auth/guards";
import { getCurrentSessionAccount } from "../../../../lib/auth/session";
import {
  getBalanceCycle,
  getPaymentDefaults,
  listArchivedInvoicesForCustomer,
  listClaimHistoryForCustomer,
  listClaimedItemsForCustomer,
  listCustomerMessagesForCustomer,
  listCustomerNotes,
  listCustomers,
  listPaymentHistoryForCustomer,
  listRestockRequests,
  listShipmentRecordsForCustomer,
} from "../../../../lib/data/local-db";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  await ensureAdminAccess();
  const { customerId } = await params;

  const [
    customers,
    balanceCycle,
    paymentDefaults,
    notes,
    customerMessages,
    claimedItems,
    claimHistory,
    paymentHistory,
    invoiceHistory,
    restockRequests,
    shipmentHistory,
    currentSession,
  ] = await Promise.all([
    listCustomers(),
    getBalanceCycle(customerId),
    getPaymentDefaults(customerId),
    listCustomerNotes(customerId),
    listCustomerMessagesForCustomer(customerId, { limit: 5 }),
    listClaimedItemsForCustomer(customerId),
    listClaimHistoryForCustomer(customerId),
    listPaymentHistoryForCustomer(customerId),
    listArchivedInvoicesForCustomer(customerId),
    listRestockRequests(customerId),
    listShipmentRecordsForCustomer(customerId),
    getCurrentSessionAccount(),
  ]);

  const customer = customers.find((entry) => entry.id === customerId);
  if (!customer) {
    return (
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 72px" }}>
        <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)" }}>
          Customer record not found.
        </section>
      </main>
    );
  }

  const isMasterAdmin = currentSession?.role === "master_admin";
  const canPromote = isMasterAdmin && customer.role === "customer";
  const canManageAccountState = customer.role === "customer";
  const currentBalance = calculateBalanceDue(balanceCycle);
  const customerMessagesForDisplay = [...customerMessages].reverse();

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px", display: "grid", gap: 24 }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)" }}>
        <a href="/admin/customers" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Back to customer list</a>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginBottom: 8, fontWeight: 700 }}>Customer record</p>
        <h1 style={{ margin: "0 0 10px" }}>{customer.displayName}</h1>
        <p style={{ margin: "0 0 8px", color: "var(--muted)" }}>{customer.email}</p>
        <p style={{ margin: 0, color: "var(--muted)" }}>{customer.address}</p>
      </section>

      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 22, padding: 20, boxShadow: "var(--shadow)" }}>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>Role</p>
          <strong>{customer.role.replaceAll("_", " ")}</strong>
        </div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 22, padding: 20, boxShadow: "var(--shadow)" }}>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>Account state</p>
          <strong>{accountStateLabel(customer.accountState)}</strong>
        </div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 22, padding: 20, boxShadow: "var(--shadow)" }}>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>Shipment status</p>
          <strong>{shipmentStatusLabel(customer.shipmentStatus)}</strong>
        </div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 22, padding: 20, boxShadow: "var(--shadow)" }}>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>Current balance</p>
          <strong>{currency.format(currentBalance)}</strong>
        </div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 22, padding: 20, boxShadow: "var(--shadow)" }}>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>Cycle due date</p>
          <strong>{balanceCycle.dueDate}</strong>
        </div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 22, padding: 20, boxShadow: "var(--shadow)" }}>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>Credit on file</p>
          <strong>{currency.format(customer.creditBalance)}</strong>
        </div>
      </section>

      <section style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)", display: "grid", gap: 16 }}>
          <h2 style={{ margin: 0 }}>Account controls</h2>
          {canManageAccountState ? <ApprovalActionForm customerId={customer.id} /> : null}
          {canPromote ? <PromoteAdminForm customerId={customer.id} /> : null}
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
          <h2 style={{ marginTop: 0 }}>Internal notes</h2>
          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            {notes.length > 0 ? notes.map((note) => (
              <div key={note.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 10 }}>
                <p style={{ margin: 0 }}>{note.note}</p>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>{note.createdAt}</p>
              </div>
            )) : <p style={{ margin: 0, color: "var(--muted)" }}>No notes yet.</p>}
          </div>
          <CustomerNoteForm customerId={customer.id} />
        </div>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: "0 0 8px" }}>Customer messages</h2>
            <p style={{ margin: 0, color: "var(--muted)" }}>Newest 5 messages from {customer.displayName}. Open the full history when you need the complete thread.</p>
          </div>
          <a
            href={`/admin/customers/${customer.id}/messages`}
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
        <div style={{ display: "grid", gap: 12 }}>
          {customerMessagesForDisplay.length > 0 ? customerMessagesForDisplay.map((message) => (
            <div key={message.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 12 }}>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {message.senderRole === "admin" ? "Admin" : customer.displayName}
              </p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{message.message}</p>
              <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 13 }}>{message.createdAt}</p>
            </div>
          )) : <p style={{ margin: 0, color: "var(--muted)" }}>No customer messages yet.</p>}
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(232,214,195,0.88)" }}>
          <CustomerMessageReplyForm customerId={customer.id} />
        </div>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)", display: "grid", gap: 18 }}>
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Billing and payments</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
            Everything on this panel applies only to {customer.displayName}. Add manual items, adjust shipping or credits, and record payments against this customer's active cycle.
          </p>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
            <p style={{ marginTop: 0, color: "var(--muted)" }}>Subtotal</p>
            <strong>{currency.format(balanceCycle.subtotal)}</strong>
          </div>
          <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
            <p style={{ marginTop: 0, color: "var(--muted)" }}>Shipping</p>
            <strong>{currency.format(balanceCycle.shipping)}</strong>
          </div>
          <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
            <p style={{ marginTop: 0, color: "var(--muted)" }}>Adjustments</p>
            <strong>{currency.format(balanceCycle.adjustments)}</strong>
          </div>
          <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
            <p style={{ marginTop: 0, color: "var(--muted)" }}>Payments applied</p>
            <strong>{currency.format(balanceCycle.paymentsApplied + balanceCycle.creditsApplied)}</strong>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <div style={{ padding: 16, borderRadius: 20, background: "rgba(255,255,255,0.55)", border: "1px solid rgba(232,214,195,0.88)" }}>
            <h3 style={{ marginTop: 0 }}>Add manual item</h3>
            <ManualBalanceItemForm customerId={customer.id} />
          </div>
          <div style={{ padding: 16, borderRadius: 20, background: "rgba(255,255,255,0.55)", border: "1px solid rgba(232,214,195,0.88)" }}>
            <h3 style={{ marginTop: 0 }}>Shipping and adjustments</h3>
            <BalanceAdjustmentForm customerId={customer.id} />
          </div>
          <div style={{ padding: 16, borderRadius: 20, background: "rgba(255,255,255,0.55)", border: "1px solid rgba(232,214,195,0.88)" }}>
            <h3 style={{ marginTop: 0 }}>Apply payment or credit</h3>
            <PaymentPreviewForm
              defaultPayment={paymentDefaults.paymentAmount}
              defaultCredit={paymentDefaults.creditAmount}
              customerId={customer.id}
            />
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
          <h2 style={{ marginTop: 0 }}>Current claims waiting for shipment</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {claimedItems.length > 0 ? claimedItems.map((item) => (
              <div key={item.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 12, display: "grid", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong>{item.productTitle}</strong>
                    <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>Qty {item.quantity} | {item.status}</p>
                  </div>
                  <strong>{currency.format(item.quantity * item.unitPrice)}</strong>
                </div>
                <div style={{ paddingTop: 12, borderTop: "1px solid rgba(232,214,195,0.88)" }}>
                  <BalanceLineItemForm claimId={item.id} quantity={item.quantity} unitPrice={item.unitPrice} />
                </div>
              </div>
            )) : <p style={{ margin: 0, color: "var(--muted)" }}>No active claimed items found.</p>}
          </div>
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
          <h2 style={{ marginTop: 0 }}>Restock requests</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {restockRequests.length > 0 ? restockRequests.map((request) => (
              <div key={request.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 12 }}>
                <strong>{request.productTitle}</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{request.status} | {request.createdAt}</p>
              </div>
            )) : <p style={{ margin: 0, color: "var(--muted)" }}>No restock requests on file.</p>}
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
          <h2 style={{ marginTop: 0 }}>Claim history</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {claimHistory.length > 0 ? claimHistory.map((item) => (
              <div key={item.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 12, display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>{item.productTitle}</strong>
                  <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
                    Qty {item.quantity} | {item.status} | {item.createdAt}
                  </p>
                </div>
                <strong>{currency.format(item.quantity * item.unitPrice)}</strong>
              </div>
            )) : <p style={{ margin: 0, color: "var(--muted)" }}>No claim history yet.</p>}
          </div>
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
          <h2 style={{ marginTop: 0 }}>Payment history</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {paymentHistory.length > 0 ? paymentHistory.map((payment) => (
              <div key={payment.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 12, display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>{payment.notes || "Payment recorded"}</strong>
                  <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{payment.createdAt}</p>
                </div>
                <strong>{currency.format(payment.amount)}</strong>
              </div>
            )) : <p style={{ margin: 0, color: "var(--muted)" }}>No payments recorded yet.</p>}
          </div>
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
          <h2 style={{ marginTop: 0 }}>Invoice history</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {invoiceHistory.length > 0 ? invoiceHistory.map((invoice) => (
              <div key={invoice.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 12, display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>{invoice.cycleLabel}</strong>
                  <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>Paid {invoice.paidAt}</p>
                </div>
                <strong>{currency.format(invoice.total)}</strong>
              </div>
            )) : <p style={{ margin: 0, color: "var(--muted)" }}>No invoices archived yet.</p>}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
        <h2 style={{ marginTop: 0 }}>Shipment history</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {shipmentHistory.length > 0 ? shipmentHistory.map((shipment) => (
            <div key={shipment.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 12, display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <strong>{shipmentStatusLabel(shipment.status)}</strong>
                <span style={{ color: "var(--muted)" }}>{shipment.shipmentDate ?? "Pending shipment date"}</span>
              </div>
              <p style={{ margin: 0, color: "var(--muted)" }}>Requested {shipment.requestedAt}</p>
              <p style={{ margin: 0 }}><strong>Tracking:</strong> {shipment.trackingNumber ?? "Not added yet"}</p>
            </div>
          )) : <p style={{ margin: 0, color: "var(--muted)" }}>No shipment history yet.</p>}
        </div>
      </section>
    </main>
  );
}
