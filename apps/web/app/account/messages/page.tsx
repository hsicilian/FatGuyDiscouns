import { CustomerMessageForm } from "../../../components/forms/customer-message-form";
import { MessageContent } from "../../../components/messages/message-content";
import { ensureCustomerAccess } from "../../../lib/auth/guards";
import { getCurrentCustomer, listCustomerMessagesForCustomer } from "../../../lib/data/local-db";
import { formatEasternTimestamp } from "../../../lib/date-format";

export default async function AccountMessagesPage() {
  await ensureCustomerAccess();

  const currentCustomer = await getCurrentCustomer();
  const messages = await listCustomerMessagesForCustomer(currentCustomer.id);
  const thread = [...messages].reverse();

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 72px", display: "grid", gap: 24 }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)" }}>
        <a href="/account" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Back to account</a>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", margin: "12px 0 8px", fontWeight: 700 }}>Message thread</p>
        <h1 style={{ margin: "0 0 10px" }}>Messages with admin</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>All saved messages for {currentCustomer.displayName}.</p>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", display: "grid", gap: 14 }}>
        {thread.length > 0 ? thread.map((message) => (
          <article
            key={message.id}
            style={{
              padding: 14,
              borderRadius: 16,
              background: message.senderRole === "admin" ? "rgba(31,29,26,0.08)" : "rgba(255,255,255,0.56)",
              border: "1px solid rgba(232,214,195,0.85)",
            }}
          >
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {message.senderRole === "admin" ? "Admin" : "You"}
            </p>
            <MessageContent message={message.message} />
            <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 13 }}>{formatEasternTimestamp(message.createdAt)}</p>
          </article>
        )) : <p style={{ margin: 0, color: "var(--muted)" }}>No messages yet.</p>}
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)" }}>
        <h2 style={{ marginTop: 0 }}>Send a new message</h2>
        <CustomerMessageForm />
      </section>
    </main>
  );
}
