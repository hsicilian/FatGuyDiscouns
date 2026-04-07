import { canAccessFinancialReporting } from "@fatguydiscounts/core";
import { ensureMasterAdminAccess } from "../../../lib/auth/guards";
import { getCurrentSessionUser } from "../../../lib/auth/session";
import { getFinancialSummary } from "../../../lib/data/local-db";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default async function AdminReportsPage() {
  await ensureMasterAdminAccess();

  const currentUser = await getCurrentSessionUser();
  const allowed = canAccessFinancialReporting(currentUser?.role ?? "customer");
  const financialSummary = await getFinancialSummary();

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 72px" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12, color: "#8e3200" }}>Master admin only</p>
        <h1 style={{ margin: "0 0 12px" }}>Financial reporting</h1>
        <p style={{ color: "#6d655d", lineHeight: 1.7 }}>This route is gated so only master admins can access business financial summaries.</p>
      </div>
      {allowed ? (
        <div style={{ display: "grid", gap: 16 }}>
          <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 20 }}><p style={{ color: "#6d655d", marginTop: 0 }}>Total running balance</p><h2 style={{ marginBottom: 0 }}>{currency.format(financialSummary.totalRunningBalance)}</h2></div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 20 }}><p style={{ color: "#6d655d", marginTop: 0 }}>Unpaid total</p><h2 style={{ marginBottom: 0 }}>{currency.format(financialSummary.unpaidTotal)}</h2></div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 20 }}><p style={{ color: "#6d655d", marginTop: 0 }}>Unpaid invoices</p><h2 style={{ marginBottom: 0 }}>{currency.format(financialSummary.unpaidInvoiceTotal)}</h2></div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 20 }}><p style={{ color: "#6d655d", marginTop: 0 }}>Unpaid shipping</p><h2 style={{ marginBottom: 0 }}>{currency.format(financialSummary.unpaidShippingTotal)}</h2></div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 20 }}><p style={{ color: "#6d655d", marginTop: 0 }}>Payments this cycle</p><h2 style={{ marginBottom: 0 }}>{currency.format(financialSummary.paymentsThisCycle)}</h2></div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 20 }}><p style={{ color: "#6d655d", marginTop: 0 }}>Overdue total</p><h2 style={{ marginBottom: 0 }}>{currency.format(financialSummary.overdueTotal)}</h2></div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 20 }}><p style={{ color: "#6d655d", marginTop: 0 }}>Overdue accounts</p><h2 style={{ marginBottom: 0 }}>{financialSummary.overdueCustomerCount}</h2></div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 20 }}><p style={{ color: "#6d655d", marginTop: 0 }}>Archived invoice revenue</p><h2 style={{ marginBottom: 0 }}>{currency.format(financialSummary.archivedInvoiceRevenue)}</h2></div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 20 }}><p style={{ color: "#6d655d", marginTop: 0 }}>Lifetime collected</p><h2 style={{ marginBottom: 0 }}>{currency.format(financialSummary.lifetimeCollected)}</h2></div>
          </section>
          <section style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>Customer balances</h2>
            {financialSummary.customerBalances.map((entry) => (
              <div key={entry.customer} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid #eedfce", paddingTop: 12 }}>
                <div>
                  <strong>{entry.customer}</strong>
                  <p style={{ margin: "4px 0 0", color: entry.overdue ? "#8e3200" : "#6d655d" }}>{entry.overdue ? "Overdue" : "Current"}</p>
                  <p style={{ margin: "4px 0 0", color: "#6d655d" }}>
                    Invoices {currency.format(entry.invoiceAmount)} • Shipping {currency.format(entry.shippingAmount)}
                  </p>
                </div>
                <strong>{currency.format(entry.amount)}</strong>
              </div>
            ))}
          </section>
          <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Late payment watchlist</h2>
              {financialSummary.latePaymentWatchlist.map((entry) => (
                <div key={entry.customerId ?? entry.customer} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid #eedfce", paddingTop: 12 }}>
                  <div>
                    <strong>{entry.customer}</strong>
                    <p style={{ margin: "4px 0 0", color: "#6d655d" }}>
                      Invoices {currency.format(entry.invoiceAmount)} • Shipping {currency.format(entry.shippingAmount)}
                    </p>
                    <p style={{ margin: "4px 0 0", color: "#6d655d" }}>
                      Last payment {entry.lastPaymentAt ?? "No payments yet"}
                    </p>
                  </div>
                  <strong>{currency.format(entry.overdueAmount)}</strong>
                </div>
              ))}
            </div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Customer lifetime summary</h2>
              {financialSummary.customerLifetimeSummary.map((entry) => (
                <div key={entry.customerId ?? entry.customer} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid #eedfce", paddingTop: 12 }}>
                  <div>
                    <strong>{entry.customer}</strong>
                    <p style={{ margin: "4px 0 0", color: "#6d655d" }}>
                      {entry.invoiceCount} invoices • {entry.paymentCount} payments • {entry.shipmentCount} shipments
                    </p>
                    <p style={{ margin: "4px 0 0", color: "#6d655d" }}>
                      Lifetime paid {currency.format(entry.lifetimePaid)}
                    </p>
                  </div>
                  <strong>{currency.format(entry.lifetimeSpent)}</strong>
                </div>
              ))}
            </div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Shipment volume by month</h2>
              {financialSummary.monthlyShipmentVolume.map((entry) => (
                <div key={entry.monthKey} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid #eedfce", paddingTop: 12 }}>
                  <strong>{entry.monthLabel}</strong>
                  <strong>{entry.shipmentCount}</strong>
                </div>
              ))}
            </div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Monthly invoice totals</h2>
              {financialSummary.monthlyInvoiceTotals.map((entry) => (
                <div key={entry.monthKey} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid #eedfce", paddingTop: 12 }}>
                  <div>
                    <strong>{entry.monthLabel}</strong>
                    <p style={{ margin: "4px 0 0", color: "#6d655d" }}>{entry.invoiceCount} invoice{entry.invoiceCount === 1 ? "" : "s"}</p>
                  </div>
                  <strong>{currency.format(entry.total)}</strong>
                </div>
              ))}
            </div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Monthly payments received</h2>
              {financialSummary.monthlyPaymentTotals.map((entry) => (
                <div key={entry.monthKey} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid #eedfce", paddingTop: 12 }}>
                  <div>
                    <strong>{entry.monthLabel}</strong>
                    <p style={{ margin: "4px 0 0", color: "#6d655d" }}>{entry.paymentCount} payment{entry.paymentCount === 1 ? "" : "s"}</p>
                  </div>
                  <strong>{currency.format(entry.total)}</strong>
                </div>
              ))}
            </div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Monthly customer spend</h2>
              {financialSummary.monthlyCustomerSpend.map((entry) => (
                <div key={`${entry.monthKey}-${entry.customerId ?? entry.customer}`} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid #eedfce", paddingTop: 12 }}>
                  <div>
                    <strong>{entry.customer}</strong>
                    <p style={{ margin: "4px 0 0", color: "#6d655d" }}>{entry.monthLabel} • {entry.invoiceCount} invoice{entry.invoiceCount === 1 ? "" : "s"}</p>
                  </div>
                  <strong>{currency.format(entry.totalSpent)}</strong>
                </div>
              ))}
            </div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Top customer spend</h2>
              {financialSummary.topCustomers.map((entry) => (
                <div key={`${entry.customer}-${entry.customerId ?? "none"}`} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid #eedfce", paddingTop: 12 }}>
                  <div>
                    <strong>{entry.customer}</strong>
                    <p style={{ margin: "4px 0 0", color: "#6d655d" }}>{entry.invoiceCount} invoice{entry.invoiceCount === 1 ? "" : "s"}</p>
                  </div>
                  <strong>{currency.format(entry.totalSpent)}</strong>
                </div>
              ))}
            </div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Recent payments</h2>
              {financialSummary.recentPayments.map((entry) => (
                <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid #eedfce", paddingTop: 12 }}>
                  <div>
                    <strong>{entry.notes || "Payment recorded"}</strong>
                    <p style={{ margin: "4px 0 0", color: "#6d655d" }}>{entry.createdAt}</p>
                  </div>
                  <strong>{currency.format(entry.amount)}</strong>
                </div>
              ))}
            </div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Recent invoices</h2>
              {financialSummary.recentInvoices.map((entry) => (
                <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid #eedfce", paddingTop: 12 }}>
                  <div>
                    <strong>{entry.customer}</strong>
                    <p style={{ margin: "4px 0 0", color: "#6d655d" }}>{entry.cycleLabel} • {entry.paidAt}</p>
                  </div>
                  <strong>{currency.format(entry.total)}</strong>
                </div>
              ))}
            </div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Restock demand</h2>
              {financialSummary.restockDemand.map((entry) => (
                <div key={entry.productTitle} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid #eedfce", paddingTop: 12 }}>
                  <div>
                    <strong>{entry.productTitle}</strong>
                    <p style={{ margin: "4px 0 0", color: "#6d655d" }}>
                      {entry.customerCount} customer{entry.customerCount === 1 ? "" : "s"} • {entry.openCount} open
                    </p>
                  </div>
                  <strong>{entry.requestCount}</strong>
                </div>
              ))}
            </div>
            <div style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Item request demand</h2>
              {financialSummary.itemRequestDemand.map((entry) => (
                <div key={`${entry.request}-${entry.latestRequestAt ?? ""}`} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid #eedfce", paddingTop: 12 }}>
                  <div>
                    <strong>{entry.request}</strong>
                    <p style={{ margin: "4px 0 0", color: "#6d655d" }}>
                      {entry.customerCount} customer{entry.customerCount === 1 ? "" : "s"} • latest {entry.latestRequestAt ?? "n/a"}
                    </p>
                  </div>
                  <strong>{entry.requestCount}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : <section style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 24 }}>Financial reports are hidden for regular admins.</section>}
    </main>
  );
}
