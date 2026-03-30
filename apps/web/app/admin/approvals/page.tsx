import { accountStateLabel } from "@fatguydiscounts/core";
import { ApprovalActionForm } from "../../../components/forms/approval-action-form";
import { previewApprovalAction } from "../../../lib/actions/approvals";
import { ensureAdminAccess } from "../../../lib/auth/guards";
import { listCustomers } from "../../../lib/data/local-db";

export default async function AdminApprovalsPage() {
  await ensureAdminAccess();

  const customers = await listCustomers();
  const pending = customers.filter((customer) => customer.accountState === "pending_approval");
  const preview = previewApprovalAction("approved");

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Access desk</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 10px" }}>Approvals queue</h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 760, margin: 0 }}>
              Review new accounts, approve claiming access, disable claiming when needed, and keep the customer base under manual control.
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.52)", border: "1px solid rgba(232,214,195,0.9)", borderRadius: 18, padding: 16, minWidth: 220 }}>
            <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Pending accounts</p>
            <strong style={{ fontSize: "1.9rem" }}>{pending.length}</strong>
          </div>
        </div>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 20, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <strong>Workflow preview:</strong> {preview.allowed ? ` admin can set state to ${preview.nextState}` : " action blocked"}
      </section>

      <div style={{ display: "grid", gap: 16 }}>
        {pending.length > 0 ? pending.map((customer) => (
          <section key={customer.id} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
            <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              <div>
                <p style={{ marginTop: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12 }}>Approval candidate</p>
                <h2 style={{ marginTop: 0 }}>{customer.displayName}</h2>
                <p style={{ color: "var(--muted)", margin: 0 }}>{customer.email}</p>
                <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>{customer.address}</p>
                <p style={{ color: "var(--accent-strong)", marginBottom: 0 }}>{accountStateLabel(customer.accountState)}</p>
              </div>
              <div style={{ padding: 16, borderRadius: 20, background: "rgba(255,255,255,0.55)", border: "1px solid rgba(232,214,195,0.88)" }}>
                <ApprovalActionForm customerId={customer.id} />
              </div>
            </div>
          </section>
        )) : <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", color: "var(--muted)" }}>No accounts are currently waiting for approval.</section>}
      </div>
    </main>
  );
}