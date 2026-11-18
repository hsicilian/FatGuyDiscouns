"use client";
import { useEffect, useState } from "react";
import { PAYMENT_REMINDER, saleMessage } from "../../lib/push/policy";
import { pushRequest } from "./notification-settings";

export function AdminPush() {
  const [recipientMode, setRecipientMode] = useState("all");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<{ id: string; displayName: string; email: string }[]>([]);
  const [customer, setCustomer] = useState<{ id: string; displayName: string; email: string } | null>(null);
  const [searched, setSearched] = useState(false);
  const [more, setMore] = useState(false);
  const [delivery, setDelivery] = useState("in_app_only");
  const [category, setCategory] = useState("sales");
  const [title, setTitle] = useState("FGD Sale Announcement");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sends, setSends] = useState<any[]>([]);
  const [enabled, setEnabled] = useState(false);
  async function refresh() {
    const response = await fetch("/api/push", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setSends(data.sends ?? []); setEnabled(data.sendingEnabled === true);
  }
  useEffect(() => { refresh().catch(e => setMessage(e.message)); }, []);
  function invalidate() { setPreview(null); setConfirmed(false); }
  async function run(task: () => Promise<void>) {
    setBusy(true); setMessage("");
    try { await task(); } catch (error: any) { setMessage(error.message); } finally { setBusy(false); }
  }
  async function prepare(testOnly: boolean) {
    invalidate();
    if (category !== "invoices") saleMessage({ title, body });
    if (!testOnly && recipientMode === "customer" && !customer) throw new Error("Select one customer first.");
    const recipient = !testOnly && recipientMode === "customer" ? { mode: "customer", customerId: customer!.id } : { mode: "all" };
    setPreview(await pushRequest({ op: "preview", category, title, body, testOnly, recipient, delivery }));
  }
  async function finishPending(result: any) {
    // Continue only this explicitly confirmed send while the page remains open.
    // Each server request is bounded and persisted; reloads can resume safely.
    for (let batch = 0; result.counts.pending > 0 && batch < 2200; batch++) {
      setMessage(`Sending: ${result.counts.pending} devices still pending. Keep this page open, or resume from history later.`);
      result = await pushRequest({ op: "process", id: result.id });
    }
    await refresh();
    return result;
  }
  return <>
    <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24 }}>
      <h2>Send customer notifications</h2>
      <p>Manual sends only. Due dates remain Sunday, with overdue balances starting Monday (Eastern Time). Payment recipients are checked again when sent.</p>
      <label>Notification type <select value={category} disabled={busy} onChange={e => { setCategory(e.target.value); if (e.target.value === "general") { setDelivery("in_app_only"); if (title === "FGD Sale Announcement") setTitle("FGD Update"); } invalidate(); }}>
        <option value="sales">Sale Announcements</option><option value="invoices">Payment Reminders</option><option value="general">General Updates</option>
      </select></label>
      <p><label>Delivery <select value={delivery} disabled={busy || category === "general"} onChange={e => { setDelivery(e.target.value); invalidate(); }}>
        <option value="in_app_only">In-app only</option><option value="in_app_push">In-app + Phone Push</option>
      </select></label></p>
      {category === "general" && <p>General Updates go to the customer inbox only. No phone notification is sent.</p>}
      <div style={{ display: "grid", gap: 12, margin: "16px 0", minWidth: 0 }}>
        <label>Recipients <select value={recipientMode} disabled={busy} onChange={e => {
          setRecipientMode(e.target.value); setCustomer(null); setMatches([]); setQuery(""); setSearched(false); invalidate();
        }}><option value="all">All customers</option><option value="customer">Specific customer</option></select></label>
        {recipientMode === "customer" && <>
          <label>Customer name or email <input value={query} maxLength={100} disabled={busy} onChange={e => {
            setQuery(e.target.value); setCustomer(null); setMatches([]); setSearched(false); invalidate();
          }} /></label>
          <button disabled={busy || query.trim().length < 2} onClick={() => run(async () => {
            const result = await pushRequest({ op: "searchCustomers", query });
            setMatches(result.customers); setMore(result.more); setSearched(true);
          })}>Search customers</button>
          {searched && !matches.length && <p>No matching customers. Try another name or email.</p>}
          {searched && more && <p>Showing the first 20 matches. Refine your search if needed.</p>}
          {matches.length > 0 && <label>Choose one customer <select style={{ width: "100%", minHeight: 44 }} value={customer?.id ?? ""} disabled={busy} onChange={e => {
            setCustomer(matches.find(c => c.id === e.target.value) ?? null); invalidate();
          }}><option value="">Select a customer</option>{matches.map(c => <option key={c.id} value={c.id}>{c.displayName} — {c.email} — {c.id}</option>)}</select></label>}
          {customer && <p style={{ overflowWrap: "anywhere" }}>Selected: <strong>{customer.displayName}</strong> · {customer.email}<br /><small>Account ID: {customer.id}</small></p>}
        </>}
      </div>
      <h3>{category === "general" ? "General Updates" : category === "sales" ? "Sale Announcements" : "Payment Reminders"}</h3>
      <p>{category === "general" ? "Share store news, website improvements, or general customer information." : category === "sales" ? "Compose a sale or promotion announcement for all intended customers. Phone push is added only for customers who chose sale notifications." : "Use the standard invoice reminder for customers with a payment currently due. Phone push still requires their payment-reminder preference. Customers who have paid are excluded."}</p>
      {category !== "invoices" ? <div style={{ display: "grid", gap: 12, margin: "16px 0" }}>
        <label>Title <input value={title} maxLength={80} disabled={busy} onChange={e => { setTitle(e.target.value); invalidate(); }} /></label>
        <label>Message <textarea value={body} maxLength={240} disabled={busy} onChange={e => { setBody(e.target.value); invalidate(); }} /></label>
        <small>{category === "general" ? "Write a brief customer update." : "Tell customers when and where the sale is happening, such as your Facebook group, Whatnot show, or Twitch stream."} No link is needed. Do not include sensitive customer information.</small>
      </div> : <p><strong>{PAYMENT_REMINDER.title}</strong><br />{PAYMENT_REMINDER.body}<br />Opens /account after sign-in.</p>}
      <p><button disabled={busy || (recipientMode === "customer" && !customer)} onClick={() => run(() => prepare(false))}>{category === "invoices" ? "Send Payment Reminders — Preview" : category === "general" ? "Preview general update" : "Preview sale announcement"}</button>{" "}
        <button disabled={busy || delivery !== "in_app_push"} onClick={() => run(() => prepare(true))}>Preview test to my devices only</button></p>
      {preview && <div style={{ border: "1px solid var(--line)", padding: 20, margin: "16px 0" }}>
        <h3>{preview.testOnly ? "OWNER TEST" : "Customer send"}: Preview</h3>
        <p style={{ overflowWrap: "anywhere" }}>Recipients: {preview.testOnly ? "My Owner devices only" : preview.customer ? <><strong>{preview.customer.displayName}</strong> · {preview.customer.email}<br /><small>Account ID: {preview.customer.id}</small></> : "All customers"}</p>
        <p><strong>Delivery: {preview.delivery === "in_app_only" ? "In-app only (no phone push)" : preview.testOnly ? "Owner phone test only" : "In-app + Phone Push"}</strong></p>
        <strong>{preview.message.title}</strong><p>{preview.message.body}</p><p>{preview.message.url ? `Opens: ${preview.message.url}` : "Announcement only. Tapping dismisses it without opening a page."}</p>
        <p>{!preview.testOnly && <>{preview.inAppCustomers} customers receiving an in-app notification<br /></>}{preview.customers} {preview.testOnly ? "owner accounts" : "customers eligible for phone push"} · {preview.devices} active registered devices (delivery is not guaranteed)</p>
        {!preview.devices && <p role="status">{preview.delivery === "in_app_only" ? "Phone push is off for this send." : "No eligible phone devices."} {!preview.testOnly && preview.inAppCustomers > 0 ? "In-app notifications will still be delivered." : "No eligible recipients for this notification."}</p>}
        {!preview.testOnly && !preview.inAppCustomers && <p>No eligible customers. Payment reminders require an unpaid balance currently due that has not already been reminded this cycle.</p>}
        <p>Counts can change before delivery. Paid balances, opt-outs and already-reminded cycles are excluded. Preview expires after 30 minutes.</p>
        <label><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} /> I confirm sending this {preview.testOnly ? "test to my devices" : preview.customer ? "notification only to the selected customer using the delivery mode shown above" : "notification to eligible customers"} now.</label>
        <p><button disabled={busy || !confirmed || !enabled || !(preview.testOnly ? preview.devices : preview.inAppCustomers)} onClick={() => run(async () => {
          const result = await finishPending(await pushRequest({ op: "confirm", id: preview.id, confirmed }));
          invalidate(); await refresh(); setMessage(`Send recorded: ${result.inAppCustomers} in-app recipients, ${result.customers} phone-push customers, ${result.devices} devices. Review delivery progress below.`);
        })}>Confirm and send</button></p>
      </div>}
      {!enabled && <p>Sending is disabled until the controlled deployment and testing phase is approved and configured.</p>}
      <p role="status">{message}</p>
      <h3>Recent sends and delivery progress</h3>
      <p>Accepted means accepted by the push provider, not proof of receipt or viewing. Attempted counts include unknown/interrupted outcomes, but exclude queued, in-progress and skipped records. Interrupted/unknown deliveries are not automatically resent.</p>
      <button disabled={busy} onClick={() => run(refresh)}>Refresh results</button>
      {sends.map(send => <article key={send.id} style={{ borderTop: "1px solid var(--line)", padding: "16px 0" }}>
        <strong>{send.test_only ? "Owner test: " : ""}{send.message.title}</strong>
        <p>Delivery: {send.message.delivery === "in_app_only" ? "In-app only" : send.test_only ? "Owner phone test only" : "In-app + Phone Push"}</p>
        {send.message.recipient?.mode === "customer" && <p style={{ overflowWrap: "anywhere" }}>Specific customer · Account ID: {send.message.recipient.customerId}</p>}
        <p>{send.created_at} · {send.inAppCustomers} in-app recipients · {send.customers} phone-push customers · {send.devices} delivery records · {send.attemptedDevices ?? 0} devices attempted</p>
        <p>{Object.entries(send.counts).map(([status, count]) => `${status}: ${count}`).join(" · ") || "No eligible deliveries"}</p>
        {send.failureAlerts?.map((alert: any) => <p key={alert.id} role="status">{alert.kind === "configuration" ? "System configuration warning" : "Customer phone failure warning"}: {alert.failed_count} rejected registrations; HTTP {alert.provider_statuses.join(", ")}. {alert.kind === "invalid" && <>{alert.remaining_devices} other registrations active at failure. </>}<a href="/admin/notifications">View internal failure notifications</a>{alert.kind === "invalid" && <> · <a href={`/admin/customers/${alert.customer_id}`}>View affected customer</a></>}</p>)}
        {(send.counts.pending || send.counts.retry || send.counts.sending) ? <button disabled={busy || !enabled} onClick={() => run(async () => {
          await finishPending(await pushRequest({ op: "process", id: send.id })); setMessage("Pending deliveries checked. Retries respect provider backoff; return later if they are not due yet.");
        })}>Continue pending deliveries</button> : null}
      </article>)}
    </section>
  </>;
}
