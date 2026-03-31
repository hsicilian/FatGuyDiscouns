import { applyPaymentToBalance, calculateBalanceDue, getNextScheduledDueDate, isBalanceOverdue, shouldArchiveBalance } from "@fatguydiscounts/core";
import { PaymentPreviewForm } from "../../../components/forms/payment-preview-form";
import { ensureAdminAccess } from "../../../lib/auth/guards";
import { getBalanceCycle, getPaymentDefaults } from "../../../lib/data/local-db";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default async function AdminPaymentsPage() {
  await ensureAdminAccess();

  const [balanceCycle, paymentDefaults] = await Promise.all([getBalanceCycle(), getPaymentDefaults()]);
  const due = calculateBalanceDue(balanceCycle);
  const preview = applyPaymentToBalance(due, paymentDefaults.paymentAmount, paymentDefaults.creditAmount);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = isBalanceOverdue(balanceCycle, today);
  const nextRegularDueDate = getNextScheduledDueDate(today);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Cash desk</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 10px" }}>Payments and archive flow</h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 760, margin: 0 }}>
              Apply partial payments, use customer credit, record overpayments, and archive a cycle when the balance reaches zero.
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.52)", border: "1px solid rgba(232,214,195,0.9)", borderRadius: 18, padding: 16, minWidth: 220 }}>
            <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Amount due</p>
            <strong style={{ fontSize: "1.9rem" }}>{currency.format(due)}</strong>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 24 }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 22, padding: 22, boxShadow: "var(--shadow)" }}><p style={{ marginTop: 0, color: "var(--muted)" }}>Incoming payment</p><h2 style={{ marginBottom: 0 }}>{currency.format(paymentDefaults.paymentAmount)}</h2></div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 22, padding: 22, boxShadow: "var(--shadow)" }}><p style={{ marginTop: 0, color: "var(--muted)" }}>Credit applied</p><h2 style={{ marginBottom: 0 }}>{currency.format(paymentDefaults.creditAmount)}</h2></div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 22, padding: 22, boxShadow: "var(--shadow)" }}><p style={{ marginTop: 0, color: "var(--muted)" }}>Remaining after payment</p><h2 style={{ marginBottom: 0 }}>{currency.format(Math.max(preview.remaining, 0))}</h2></div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 22, padding: 22, boxShadow: "var(--shadow)" }}><p style={{ marginTop: 0, color: "var(--muted)" }}>{overdue ? "Next regular due date" : "Cycle due date"}</p><h2 style={{ marginBottom: 0 }}>{overdue ? nextRegularDueDate : balanceCycle.dueDate}</h2></div>
      </div>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
        <h2 style={{ marginTop: 0 }}>Payment application</h2>
        <p style={{ color: preview.paidInFull ? "#2f5d32" : "var(--accent-strong)", marginBottom: 24, lineHeight: 1.7 }}>
          {shouldArchiveBalance(preview.remaining)
            ? `Cycle should archive now. Overpayment to convert into credit: ${currency.format(preview.overpayment)}`
            : "Cycle stays active until the remaining balance is cleared."}
        </p>
        <PaymentPreviewForm defaultPayment={paymentDefaults.paymentAmount} defaultCredit={paymentDefaults.creditAmount} />
      </section>
    </main>
  );
}
