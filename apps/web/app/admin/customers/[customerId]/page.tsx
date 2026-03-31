import { accountStateLabel, shipmentStatusLabel } from "@fatguydiscounts/core";
import { ApprovalActionForm } from "../../../../components/forms/approval-action-form";
import { CustomerNoteForm } from "../../../../components/forms/customer-note-form";
import { PromoteAdminForm } from "../../../../components/forms/promote-admin-form";
import { ensureAdminAccess } from "../../../../lib/auth/guards";
import { getCurrentSessionAccount } from "../../../../lib/auth/session";
import { getFinancialSummary, listClaimedItemsForCustomer, listCustomerNotes, listCustomers, listRestockRequests } from "../../../../lib/data/local-db";

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

  const [customers, financialSummary, notes, claimedItems, restockRequests, currentSession] = await Promise.all([
    listCustomers(),
    getFinancialSummary(),
    listCustomerNotes(customerId),
    listClaimedItemsForCustomer(customerId),
    listRestockRequests(customerId),
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

  const balanceRow = financialSummary.customerBalances.find((entry) => entry.customer === customer.displayName);
  const isMasterAdmin = currentSession?.role === "master_admin";
  const canPromote = isMasterAdmin && customer.role === "customer";
  const canManageAccountState = customer.role === "customer";

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
          <strong>{currency.format(balanceRow?.amount ?? 0)}</strong>
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

      <section style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
          <h2 style={{ marginTop: 0 }}>Current claims</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {claimedItems.length > 0 ? claimedItems.map((item) => (
              <div key={item.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 12, display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>{item.productTitle}</strong>
                  <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>Qty {item.quantity} • {item.status}</p>
                </div>
                <strong>{currency.format(item.quantity * item.unitPrice)}</strong>
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
                <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{request.status} • {request.createdAt}</p>
              </div>
            )) : <p style={{ margin: 0, color: "var(--muted)" }}>No restock requests on file.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
