import { CreditHistoryEditForm } from "../../../components/forms/credit-history-edit-form";
import { PaymentHistoryEditForm } from "../../../components/forms/payment-history-edit-form";
import { ensureMasterAdminAccess } from "../../../lib/auth/guards";
import { listCreditHistory, listCustomers, listPaymentHistory } from "../../../lib/data/local-db";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default async function AdminPaymentsPage() {
  await ensureMasterAdminAccess();

  const [customers, payments, credits] = await Promise.all([
    listCustomers(),
    listPaymentHistory(),
    listCreditHistory(),
  ]);
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 72px", display: "grid", gap: 24 }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Master admin only</p>
        <h1 style={{ margin: "0 0 10px" }}>Payments and credits</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, margin: 0, maxWidth: 820 }}>
          Review payment and credit records across all customers, fix mistyped amounts, and repair older entries that were attached to the wrong cycle.
        </p>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Payment ledger</h2>
          <span style={{ color: "var(--muted)" }}>{payments.length} records</span>
        </div>
        <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
          {payments.length > 0 ? payments.map((payment) => {
            const customer = customerMap.get(payment.customerId);
            return (
              <div key={payment.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 16, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ display: "block" }}>{customer?.displayName ?? "Unknown customer"}</strong>
                    <span style={{ color: "var(--muted)" }}>{customer?.email ?? payment.customerId}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ display: "block" }}>{currency.format(payment.amount)}</strong>
                    <span style={{ color: "var(--muted)" }}>{payment.notes || "Payment recorded"}</span>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", color: "var(--muted)" }}>
                  <span>{payment.createdAt}</span>
                  <span>Applied: {currency.format(payment.appliedAmount ?? payment.amount)}</span>
                  <span>Credit created: {currency.format(payment.overpaymentAmount ?? 0)}</span>
                  <span>Cycle: {payment.cycleStatus ?? "unknown"}</span>
                  {customer ? <a href={`/admin/customers/${customer.id}`} style={{ color: "var(--accent-strong)" }}>Open CRM</a> : null}
                </div>
                <PaymentHistoryEditForm
                  paymentId={payment.id}
                  defaultAmount={payment.amount}
                  defaultRecordedAt={payment.createdAt.slice(0, 10)}
                />
              </div>
            );
          }) : <p style={{ margin: 0, color: "var(--muted)" }}>No payment records yet.</p>}
        </div>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Credit ledger</h2>
          <span style={{ color: "var(--muted)" }}>{credits.length} records</span>
        </div>
        <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
          {credits.length > 0 ? credits.map((credit) => {
            const customer = customerMap.get(credit.customerId);
            const isEditable = credit.amount >= 0;
            return (
              <div key={credit.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 16, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ display: "block" }}>{customer?.displayName ?? "Unknown customer"}</strong>
                    <span style={{ color: "var(--muted)" }}>{customer?.email ?? credit.customerId}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ display: "block" }}>{currency.format(credit.amount)}</strong>
                    <span style={{ color: "var(--muted)" }}>{credit.reason || "Credit entry"}</span>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", color: "var(--muted)" }}>
                  <span>{credit.createdAt}</span>
                  {customer ? <a href={`/admin/customers/${customer.id}`} style={{ color: "var(--accent-strong)" }}>Open CRM</a> : null}
                </div>
                {isEditable ? (
                  <CreditHistoryEditForm
                    creditId={credit.id}
                    defaultAmount={credit.amount}
                    defaultRecordedAt={credit.createdAt.slice(0, 10)}
                    defaultReason={credit.reason}
                  />
                ) : (
                  <p style={{ margin: 0, color: "var(--muted)" }}>Applied credits are shown here for reference and stay read-only.</p>
                )}
              </div>
            );
          }) : <p style={{ margin: 0, color: "var(--muted)" }}>No credit records yet.</p>}
        </div>
      </section>
    </main>
  );
}
