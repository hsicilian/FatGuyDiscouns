import { getCurrentSessionUser } from "../../lib/auth/session";
import { canManagePush } from "../../lib/push/policy";
import { readNotificationSubscribers } from "../../lib/push/subscriber-reads";
import { CrmSubscribers, CustomerPhoneStatus } from "./crm-subscribers";

export async function CrmSubscriberPanel({ customerId }: { customerId?: string }) {
  if (!canManagePush(await getCurrentSessionUser())) return null;
  let summary;
  try { summary = await readNotificationSubscribers(customerId); }
  catch { return <section aria-label="Phone notification subscribers" style={{ marginBottom: 24 }}><h2>Phone notification subscribers</h2><p role="status">Phone notification information is unavailable. Reload to try again. Counts have not been assumed to be zero.</p></section>; }
  return <section aria-label="Phone notification subscribers" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 20, marginBottom: 24 }}>
    <h2 style={{ marginTop: 0 }}>{customerId ? "Phone notification preferences and registrations" : "Phone notification subscribers"}</h2>
    {customerId ? (summary.rows[0] ? <CustomerPhoneStatus row={summary.rows[0]} /> : <p>This is not a customer notification account.</p>) : <CrmSubscribers summary={summary} />}
    <p style={{ color: "var(--muted)", fontSize: 14 }}>Read-only registration status as of this page load. Reload for current data. Registration does not guarantee successful phone delivery. Saved choices apply across the customer’s devices.</p>
  </section>;
}
