import { accountStateLabel, shipmentStatusLabel } from "@fatguydiscounts/core";
import { ApprovalActionForm } from "../../../components/forms/approval-action-form";
import { CustomerNoteForm } from "../../../components/forms/customer-note-form";
import { PromoteAdminForm } from "../../../components/forms/promote-admin-form";
import { ensureAdminAccess } from "../../../lib/auth/guards";
import { getCurrentSessionAccount } from "../../../lib/auth/session";
import { getFinancialSummary, listCustomerNotes, listCustomers } from "../../../lib/data/local-db";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type AdminCustomersPageProps = {
  searchParams?: Promise<{
    query?: string;
    state?: string;
    shipment?: string;
  }>;
};

export default async function AdminCustomersPage({ searchParams }: AdminCustomersPageProps) {
  await ensureAdminAccess();

  const params = searchParams ? await searchParams : undefined;
  const query = params?.query?.trim().toLowerCase() ?? "";
  const stateFilter = params?.state?.trim() ?? "all";
  const shipmentFilter = params?.shipment?.trim() ?? "all";

  const [customers, financialSummary, notes, currentSession] = await Promise.all([
    listCustomers(),
    getFinancialSummary(),
    listCustomerNotes(),
    getCurrentSessionAccount(),
  ]);

  const isMasterAdmin = currentSession?.role === "master_admin";

  const filteredCustomers = customers.filter((customer) => {
    const matchesQuery = query.length === 0
      || customer.displayName.toLowerCase().includes(query)
      || customer.email.toLowerCase().includes(query)
      || customer.address.toLowerCase().includes(query);
    const matchesState = stateFilter === "all" || customer.accountState === stateFilter;
    const matchesShipment = shipmentFilter === "all" || customer.shipmentStatus === shipmentFilter;
    return matchesQuery && matchesState && matchesShipment;
  });

  const pendingCount = customers.filter((customer) => customer.accountState === "pending_approval").length;
  const overdueCount = financialSummary.customerBalances.filter((entry) => entry.overdue).length;

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Customer CRM</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 10px" }}>Customer records and notes</h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 760, margin: 0 }}>
              Search customers by name, email, or address, filter by approval or shipment state, and keep internal notes close to the rest of the CRM workflow.
            </p>
          </div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", width: "min(100%, 480px)" }}>
            <div style={{ background: "rgba(255,255,255,0.52)", border: "1px solid rgba(232,214,195,0.9)", borderRadius: 18, padding: 16 }}>
              <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Customers</p>
              <strong style={{ fontSize: "1.8rem" }}>{customers.length}</strong>
            </div>
            <div style={{ background: "rgba(255,255,255,0.52)", border: "1px solid rgba(232,214,195,0.9)", borderRadius: 18, padding: 16 }}>
              <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Pending</p>
              <strong style={{ fontSize: "1.8rem" }}>{pendingCount}</strong>
            </div>
            <div style={{ background: "rgba(255,255,255,0.52)", border: "1px solid rgba(232,214,195,0.9)", borderRadius: 18, padding: 16 }}>
              <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Overdue</p>
              <strong style={{ fontSize: "1.8rem" }}>{overdueCount}</strong>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 20, boxShadow: "var(--shadow)", marginBottom: 24, display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <h2 style={{ margin: "0 0 8px" }}>CRM filters</h2>
            <p style={{ color: "var(--muted)", margin: 0 }}>Unpaid total across customers: {currency.format(financialSummary.unpaidTotal)}</p>
          </div>
          <span style={{ color: "var(--muted)" }}>{filteredCustomers.length} matching record{filteredCustomers.length === 1 ? "" : "s"}</span>
        </div>
        <form style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>Search</span>
            <input name="query" defaultValue={params?.query ?? ""} placeholder="Name, email, address" style={{ padding: 12, borderRadius: 14, border: "1px solid #d9c7b2" }} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>Account state</span>
            <select name="state" defaultValue={stateFilter} style={{ padding: 12, borderRadius: 14, border: "1px solid #d9c7b2" }}>
              <option value="all">All states</option>
              <option value="pending_approval">Pending approval</option>
              <option value="approved">Approved</option>
              <option value="claiming_disabled">Claiming disabled</option>
              <option value="banned">Banned</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>Shipment status</span>
            <select name="shipment" defaultValue={shipmentFilter} style={{ padding: 12, borderRadius: 14, border: "1px solid #d9c7b2" }}>
              <option value="all">All shipment states</option>
              <option value="none">None</option>
              <option value="requested">Requested</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "12px 16px" }}>Apply Filters</button>
            <a href="/admin/customers" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, padding: "12px 16px", border: "1px solid #d9c7b2", color: "#1f1d1a" }}>
              Reset
            </a>
          </div>
        </form>
      </section>

      <div style={{ display: "grid", gap: 16 }}>
        {filteredCustomers.length > 0 ? filteredCustomers.map((customer) => {
          const customerNotes = notes.filter((entry) => entry.customerId === customer.id).slice(0, 3);
          const balanceRow = financialSummary.customerBalances.find((entry) => entry.customer === customer.displayName);
          const canPromote = isMasterAdmin && customer.role === "customer";
          const canManageAccountState = customer.role === "customer";

          return (
            <section key={customer.id} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
              <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                <div>
                  <p style={{ marginTop: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12 }}>Customer record</p>
                  <h2 style={{ marginTop: 0 }}>{customer.displayName}</h2>
                  <p style={{ color: "var(--muted)", margin: 0 }}>{customer.email}</p>
                  <p style={{ color: "var(--muted)", margin: "6px 0" }}>{customer.address}</p>
                  <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                    <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                      <p style={{ margin: 0, color: "var(--muted)" }}>Role</p>
                      <strong>{customer.role.replaceAll("_", " ")}</strong>
                    </div>
                    <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                      <p style={{ margin: 0, color: "var(--muted)" }}>Account state</p>
                      <strong>{accountStateLabel(customer.accountState)}</strong>
                    </div>
                    <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                      <p style={{ margin: 0, color: "var(--muted)" }}>Shipment status</p>
                      <strong>{shipmentStatusLabel(customer.shipmentStatus)}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                    <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                      <p style={{ margin: 0, color: "var(--muted)" }}>Credit balance</p>
                      <strong>{currency.format(customer.creditBalance)}</strong>
                    </div>
                    <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                      <p style={{ margin: 0, color: "var(--muted)" }}>Current balance</p>
                      <strong>{currency.format(balanceRow?.amount ?? 0)}</strong>
                    </div>
                    <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                      <p style={{ margin: 0, color: "var(--muted)" }}>Last shipment</p>
                      <strong>{customer.lastShipmentDate ?? "None"}</strong>
                    </div>
                  </div>
                  <div style={{ padding: 16, borderRadius: 18, background: balanceRow?.overdue ? "rgba(142,50,0,0.1)" : "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                    <p style={{ marginTop: 0, color: "var(--muted)" }}>Balance status</p>
                    <strong style={{ color: balanceRow?.overdue ? "#8e3200" : "#1f1d1a" }}>{balanceRow?.overdue ? "Overdue" : "Current"}</strong>
                  </div>
                  {canManageAccountState ? (
                    <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                      <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: "1rem" }}>Account controls</h3>
                      <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>Approve, disable claiming, or ban this customer directly from the CRM.</p>
                      <ApprovalActionForm customerId={customer.id} />
                    </div>
                  ) : null}
                  {canPromote ? (
                    <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                      <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: "1rem" }}>Master admin</h3>
                      <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>Promote this customer to admin access without leaving the CRM workflow.</p>
                      <PromoteAdminForm customerId={customer.id} />
                    </div>
                  ) : null}
                  <div>
                    <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: "1rem" }}>Internal notes</h3>
                    <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                      {customerNotes.length > 0 ? customerNotes.map((note) => (
                        <div key={note.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 8 }}>
                          <p style={{ margin: 0, color: "#1f1d1a" }}>{note.note}</p>
                          <p style={{ margin: "4px 0 0", color: "#6d655d", fontSize: 13 }}>{note.createdAt}</p>
                        </div>
                      )) : <p style={{ margin: 0, color: "var(--muted)" }}>No notes yet.</p>}
                    </div>
                    <CustomerNoteForm customerId={customer.id} />
                  </div>
                </div>
              </div>
            </section>
          );
        }) : <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", color: "var(--muted)" }}>No customers matched the current filters.</section>}
      </div>
    </main>
  );
}
