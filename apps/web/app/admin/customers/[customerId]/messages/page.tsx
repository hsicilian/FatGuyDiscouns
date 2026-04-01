import { ensureAdminAccess } from "../../../../../lib/auth/guards";
import { listCustomerMessagesForCustomer, listCustomers } from "../../../../../lib/data/local-db";
import { CustomerMessageReplyForm } from "../../../../../components/forms/customer-message-reply-form";

export default async function AdminCustomerMessagesPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  await ensureAdminAccess();
  const { customerId } = await params;

  const [customers, messages] = await Promise.all([
    listCustomers(),
    listCustomerMessagesForCustomer(customerId),
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

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 72px", display: "grid", gap: 24 }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)" }}>
        <a href={`/admin/customers/${customer.id}`} style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Back to CRM record</a>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", margin: "12px 0 8px", fontWeight: 700 }}>Customer messages</p>
        <h1 style={{ margin: "0 0 10px" }}>{customer.displayName}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>{customer.email}</p>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", display: "grid", gap: 14 }}>
        {messages.length > 0 ? messages.map((message) => (
          <article key={message.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 14 }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {message.senderRole === "admin" ? "Admin" : customer.displayName}
            </p>
            <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.75 }}>{message.message}</p>
            <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 13 }}>{message.createdAt}</p>
          </article>
        )) : <p style={{ margin: 0, color: "var(--muted)" }}>No customer messages yet.</p>}
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)" }}>
        <h2 style={{ marginTop: 0 }}>Reply to customer</h2>
        <CustomerMessageReplyForm customerId={customer.id} />
      </section>
    </main>
  );
}
