"use client";
import { useState } from "react";
import { matchesSubscriberFilter, subscriberStatus, type Subscriber, type SubscriberFilter } from "../../lib/push/subscriber-summary";

export function CustomerPhoneStatus({ row }: { row: Subscriber }) {
  return <div>
    <p>Sale announcements: <strong>{row.sales ? "Enabled" : "Disabled"}</strong> · Payment reminders: <strong>{row.invoices ? "Enabled" : "Disabled"}</strong></p>
    <p>Active registered devices: <strong>{row.activeDevices}</strong></p>
    <p style={{ color: row.needsRecovery ? "var(--accent-strong)" : "var(--muted)" }}>{subscriberStatus(row)}</p>
  </div>;
}
export function CrmSubscribers({ summary }: { summary: { rows: Subscriber[]; total: number; sales: number; invoices: number; recovery: number } }) {
  const [filter, setFilter] = useState<SubscriberFilter>("all");
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const rows = summary.rows.filter(r => matchesSubscriberFilter(r, filter));
  function choose(value: SubscriberFilter) { setFilter(value); setPage(0); setOpen(true); }
  return <>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {([["active", "Registered + opted-in customers", summary.total], ["sales", "Sale announcement subscribers", summary.sales], ["invoices", "Payment reminder subscribers", summary.invoices], ["recovery", "Needs recovery", summary.recovery]] as const).map(([value, label, count]) =>
        <button key={value} type="button" onClick={() => choose(value)} style={{ minHeight: 44, padding: "10px 14px", borderRadius: 14, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--accent-strong)" }}>{label}: <strong>{count}</strong></button>)}
    </div>
    <p style={{ color: "var(--muted)", fontSize: 14 }}>Unique customers, not phones. Category counts require consent and an active, unexpired registration and exclude banned accounts. Payment reminders additionally require an eligible unpaid balance when sent. General Updates are in-app only.</p>
    <details open={open} onToggle={e => setOpen(e.currentTarget.open)}>
      <summary style={{ cursor: "pointer", minHeight: 44 }}>View customer notification registrations</summary>
      <label>Show <select aria-label="Notification subscriber filter" value={filter} onChange={e => choose(e.target.value as SubscriberFilter)} style={{ minHeight: 44, maxWidth: "100%" }}>
        <option value="all">All customers</option><option value="active">Registered + opted in</option><option value="sales">Sale announcements</option><option value="invoices">Payment reminders</option><option value="recovery">Needs recovery</option>
      </select></label>
      <p>{rows.length} matching customers</p>
      {rows.slice(page * 25, (page + 1) * 25).map(row => <article key={row.id} style={{ borderTop: "1px solid var(--line)", padding: "12px 0", overflowWrap: "anywhere" }}>
        <a href={`/admin/customers/${row.id}`}><strong>{row.name}</strong></a>
        <CustomerPhoneStatus row={row} />
      </article>)}
      {!rows.length && <p>No customers match this filter.</p>}
      {rows.length > 25 && <nav aria-label="Subscriber pages" style={{ display: "flex", gap: 16 }}>
        <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page + 1} of {Math.ceil(rows.length / 25)}</span>
        <button type="button" disabled={(page + 1) * 25 >= rows.length} onClick={() => setPage(page + 1)}>Next</button>
      </nav>}
    </details>
  </>;
}
