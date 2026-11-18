export type Subscriber = {
  id: string; name: string; sales: boolean; invoices: boolean;
  activeDevices: number; blocked: boolean; needsRecovery: boolean;
};
export type SubscriberFilter = "all" | "active" | "sales" | "invoices" | "recovery";
export function summarizeSubscribers(
  customers: { user_id: string; role: string; account_state: string }[],
  profiles: { user_id: string; display_name: string | null }[],
  preferences: { user_id: string; sales: boolean; invoices: boolean }[],
  subscriptions: { id: string; user_id: string; active: boolean; expires_at: string | null }[],
  now = Date.now(),
) {
  const names = new Map(profiles.map(p => [p.user_id, p.display_name]));
  const prefs = new Map(preferences.map(p => [p.user_id, p]));
  const devices = new Map<string, Set<string>>();
  for (const s of subscriptions) {
    if (!s.active || (s.expires_at !== null && !(Date.parse(s.expires_at) > now))) continue;
    if (!devices.has(s.user_id)) devices.set(s.user_id, new Set());
    devices.get(s.user_id)!.add(s.id);
  }
  const rows: Subscriber[] = [...new Map(customers.filter(c => c.role === "customer").map(c => [c.user_id, c])).values()].map(c => {
    const p = prefs.get(c.user_id), activeDevices = devices.get(c.user_id)?.size ?? 0;
    const sales = p?.sales === true, invoices = p?.invoices === true;
    return { id: c.user_id, name: names.get(c.user_id) || "Unnamed customer", sales, invoices, activeDevices,
      blocked: c.account_state === "banned", needsRecovery: (sales || invoices) && activeDevices === 0 };
  }).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return { rows, total: rows.filter(r => r.activeDevices > 0 && (r.sales || r.invoices)).length,
    sales: rows.filter(r => matchesSubscriberFilter(r, "sales")).length,
    invoices: rows.filter(r => matchesSubscriberFilter(r, "invoices")).length,
    recovery: rows.filter(r => r.needsRecovery).length };
}
export function matchesSubscriberFilter(r: Subscriber, filter: SubscriberFilter) {
  if (filter === "all") return true;
  if (filter === "recovery") return r.needsRecovery;
  if (filter === "active") return r.activeDevices > 0 && (r.sales || r.invoices);
  return !r.blocked && r.activeDevices > 0 && r[filter];
}
export function subscriberStatus(r: Subscriber) {
  const status = r.needsRecovery ? "Needs recovery — choices saved, no active phone registration"
    : r.activeDevices === 0 ? "No active phone registration; alert categories disabled"
    : !r.sales && !r.invoices ? "Phone registered; alert categories disabled" : "Phone registered; alert choices enabled";
  return r.blocked ? "Account banned — excluded from sends. " + status : status;
}
