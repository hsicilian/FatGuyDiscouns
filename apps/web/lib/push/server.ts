import "server-only";
import webpush from "web-push";
import { Agent } from "node:https";
import { getAdminClient, listActiveCycleContexts, siteToday } from "../data/supabase-helpers";
import { recordAdminAuditEntry } from "../audit";
import { canManagePush, deliveryMode, deliveryOutcome, dueCycleIds, hasConsent, PAYMENT_REMINDER, pushTarget, saleMessage, validEndpoint } from "./policy";
import type { PushActor, PushCategory, PushMessage, PushTarget, DeliveryMode } from "./policy";

type Recipient = { userId: string; subscriptionIds: string[]; cycleIds: string[] };
function checked<T extends { error?: unknown; data?: any }>(result: T): any {
  if (result.error) throw new Error("Push storage operation failed.");
  return result.data;
}
export function requireOwner(actor: PushActor | null) {
  if (!canManagePush(actor)) throw new Error("Owner access required.");
}
export function requireSending(phonePush = true) {
  if (process.env.PUSH_ENABLED !== "true" || process.env.PUSH_SEND_ENABLED !== "true" ||
      (phonePush && (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT))) {
    throw new Error("Push sending is disabled or not configured.");
  }
}
async function rows(table: string, columns: string, filter: (query: any) => any) {
  const db = await getAdminClient();
  const result: any[] = [];
  // Explicit pagination; fail closed rather than silently using a truncated audience.
  for (let offset = 0; offset <= 10000; offset += 500) {
    const page = checked(await filter(db.from(table).select(columns)).range(offset, offset + 499));
    result.push(...page);
    if (page.length < 500) return result;
  }
  throw new Error("Audience exceeds V1 capacity; no send was started.");
}
export async function preferences(userId: string) {
  const db = await getAdminClient();
  return checked(await db.from("push_preferences").select("sales,invoices").eq("user_id", userId).maybeSingle()) ?? { sales: false, invoices: false };
}
export async function savePreferences(userId: string, input: any) {
  if (typeof input.sales !== "boolean" || typeof input.invoices !== "boolean") throw new Error("Choose both preferences explicitly.");
  const db = await getAdminClient();
  checked(await db.from("push_preferences").upsert({ user_id: userId, sales: input.sales, invoices: input.invoices, updated_at: new Date().toISOString() }));
}
export async function registerSubscription(userId: string, input: any) {
  if (!input || typeof input.endpoint !== "string" || !validEndpoint(input.endpoint) ||
      !/^[A-Za-z0-9_-]{87}=?$/.test(input.keys?.p256dh ?? "") || !/^[A-Za-z0-9_-]{22}={0,2}$/.test(input.keys?.auth ?? "")) {
    throw new Error("Unsupported push subscription.");
  }
  const db = await getAdminClient();
  const existing = checked(await db.from("push_subscriptions").select("id,user_id").eq("endpoint", input.endpoint).maybeSingle());
  // Never silently transfer a browser subscription between accounts.
  if (existing && existing.user_id !== userId) throw new Error("Remove this browser subscription before enabling another account.");
  const active = checked(await db.from("push_subscriptions").select("id").eq("user_id", userId).eq("active", true));
  if (!existing && active.length >= 10) throw new Error("Disable a device before adding another (maximum 10).");
  let expires_at: string | null = null;
  if (input.expirationTime != null) {
    if (typeof input.expirationTime !== "number" || !Number.isFinite(input.expirationTime) || input.expirationTime <= Date.now()) throw new Error("Expired subscription.");
    expires_at = new Date(input.expirationTime).toISOString();
  }
  const values = { user_id: userId, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, active: true, expires_at, updated_at: new Date().toISOString() };
  const query = existing ? db.from("push_subscriptions").update(values).eq("id", existing.id).eq("user_id", userId) : db.from("push_subscriptions").insert(values);
  return checked(await query.select("id").single()).id as string;
}
export async function disableSubscription(userId: string, id?: string, all = false) {
  const db = await getAdminClient();
  if (!all && !id) return;
  let query = db.from("push_subscriptions").update({ active: false, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (!all) query = query.eq("id", id);
  checked(await query);
}
export async function deviceState(userId: string, endpoint: string) {
  const db = await getAdminClient();
  const row = checked(await db.from("push_subscriptions").select("active,expires_at").eq("user_id", userId).eq("endpoint", endpoint).maybeSingle());
  return !!row?.active && (!row.expires_at || new Date(row.expires_at).getTime() > Date.now());
}
// Authenticated installation reconciliation. Browser endpoint + encryption secrets
// prove possession; a localStorage marker alone never authorizes detaching an account.
export async function reconcileDevice(userId: string, input: any, deviceId?: string) {
  const db = await getAdminClient();
  const prior = deviceId ? checked(await db.from("push_subscriptions").select("id,user_id,active").eq("id", deviceId).maybeSingle()) : null;
  let row: any = null;
  if (input != null) {
    if (typeof input.endpoint !== "string" || !validEndpoint(input.endpoint)) throw new Error("Invalid device.");
    row = checked(await db.from("push_subscriptions").select("id,user_id,active,expires_at,p256dh,auth").eq("endpoint", input.endpoint).maybeSingle());
    if (row && (input.keys?.p256dh !== row.p256dh || input.keys?.auth !== row.auth)) throw new Error("Device proof required.");
  }
  // The HttpOnly cookie identifies an old registration even when the browser lost it.
  if (prior && prior.user_id !== userId) await disableSubscription(prior.user_id, prior.id);
  if (row && row.user_id !== userId) {
    await disableSubscription(row.user_id, row.id);
    return { active: false, switched: true, restore: false };
  }
  const active = !!row?.active && (!row.expires_at || new Date(row.expires_at).getTime() > Date.now());
  // Inactive registrations are ambiguous (opt-out or provider rejection). Do not
  // revive them automatically. Offer explicit recovery without changing consent.
  return { active, switched: false, restore: !row && prior?.user_id === userId && prior.active === true };
}
// Stored in the existing private message JSON, never included in the push payload.
// Only records made before targeting existed may omit this field.
function savedTarget(send: any): PushTarget {
  return Object.prototype.hasOwnProperty.call(send.message, "recipient") ? pushTarget(send.message.recipient) : { mode: "all" };
}
function savedDelivery(send: any): DeliveryMode {
  // Old records predate delivery selection; only absent metadata retains legacy push behavior.
  const mode = deliveryMode(Object.prototype.hasOwnProperty.call(send.message, "delivery") ? send.message.delivery : "in_app_push", send.category);
  if (mode === "in_app_only" && (send.test_only || send.message.inApp !== true)) throw new Error("Invalid in-app-only send.");
  return mode;
}
async function customerIdentity(id: string) {
  const db = await getAdminClient();
  const role = checked(await db.from("user_roles").select("role,account_state").eq("user_id", id).maybeSingle());
  if (role?.role !== "customer" || role.account_state === "banned") throw new Error("Customer unavailable.");
  const user = checked(await db.auth.admin.getUserById(id))?.user;
  if (!user) throw new Error("Customer unavailable.");
  const profile = checked(await db.from("customer_profiles").select("display_name").eq("user_id", id).maybeSingle());
  return { id, displayName: profile?.display_name || user.email || "Customer", email: user.email || "" };
}
export async function searchPushCustomers(actor: PushActor, query: unknown) {
  requireOwner(actor);
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 100) throw new Error("Enter 2–100 characters.");
  const needle = query.trim().toLowerCase();
  const roles = await rows("user_roles", "user_id,account_state", q => q.eq("role", "customer").order("user_id"));
  const allowed = new Set(roles.filter(r => r.account_state !== "banned").map(r => r.user_id));
  const profiles = await rows("customer_profiles", "user_id,display_name", q => q.order("user_id"));
  const names = new Map(profiles.map(r => [r.user_id, r.display_name]));
  const db = await getAdminClient();
  const matches: { id: string; displayName: string; email: string }[] = [];
  for (let page = 1; page <= 51; page++) {
    const users = checked(await db.auth.admin.listUsers({ page, perPage: 200 })).users;
    for (const user of users) {
      const displayName = names.get(user.id) || user.email || "Customer";
      if (allowed.has(user.id) && (displayName.toLowerCase().includes(needle) || (user.email || "").toLowerCase().includes(needle))) {
        matches.push({ id: user.id, displayName, email: user.email || "" });
        if (matches.length === 21) return { customers: matches.slice(0, 20), more: true };
      }
    }
    if (users.length < 200) return { customers: matches, more: false };
  }
  throw new Error("Customer search exceeds V1 capacity. No send started.");
}
async function audience(category: PushCategory, actorId: string, testOnly: boolean, target: PushTarget, inApp = false, delivery: DeliveryMode = "in_app_push"): Promise<Recipient[]> {
  const subscribers = delivery === "in_app_only" ? [] : await rows("push_subscriptions", "id,user_id,expires_at", q => {
    q = q.eq("active", true).order("id");
    return testOnly ? q.eq("user_id", actorId) : target.mode === "customer" ? q.eq("user_id", target.customerId) : q;
  });
  const grouped = new Map<string, string[]>();
  for (const sub of subscribers) {
    if (sub.expires_at && new Date(sub.expires_at).getTime() <= Date.now()) continue;
    grouped.set(sub.user_id, [...(grouped.get(sub.user_id) ?? []), sub.id]);
  }
  if (inApp && !testOnly) {
    const customers = await rows("user_roles", "user_id", q => {
      q = q.eq("role", "customer").order("user_id");
      return target.mode === "customer" ? q.eq("user_id", target.customerId) : q;
    });
    for (const customer of customers) if (!grouped.has(customer.user_id)) grouped.set(customer.user_id, []);
  }
  const db = await getAdminClient();
  const recipients: Recipient[] = [];
  for (const [userId, subscriptionIds] of grouped) {
    const role = checked(await db.from("user_roles").select("role,account_state").eq("user_id", userId).maybeSingle());
    if (!role || role.account_state === "banned" || (!testOnly && role.role !== "customer")) continue;
    const phoneConsent = delivery === "in_app_push" && (testOnly || hasConsent(await preferences(userId), category));
    if (!inApp && !phoneConsent) continue;
    let cycleIds: string[] = [];
    if (category === "invoices" && !testOnly) {
      cycleIds = dueCycleIds(await listActiveCycleContexts(userId), siteToday());
      const used = checked(await db.from("push_reminder_cycles").select("cycle_id").eq("customer_id", userId));
      const reserved = new Set(used.map((r: any) => r.cycle_id));
      cycleIds = cycleIds.filter(id => !reserved.has(id));
      if (!cycleIds.length) continue;
    }
    recipients.push({ userId, subscriptionIds: phoneConsent ? subscriptionIds : [], cycleIds });
  }
  return recipients;
}
export async function preview(actor: PushActor, input: any) {
  requireOwner(actor);
  if (!["sales", "invoices", "general"].includes(input.category)) throw new Error("Choose a notification type.");
  const category: PushCategory = input.category;
  const delivery = deliveryMode(input.delivery, category);
  const testOnly = input.testOnly === true;
  if (testOnly && delivery !== "in_app_push") throw new Error("Owner phone tests require phone-push delivery.");
  const target = pushTarget(input.recipient);
  if (testOnly && target.mode !== "all") throw new Error("Owner tests cannot target customers.");
  const customer = target.mode === "customer" ? await customerIdentity(target.customerId) : null;
  const message = category === "invoices" ? PAYMENT_REMINDER : saleMessage(input);
  const recipients = await audience(category, actor.id, testOnly, target, !testOnly, delivery);
  const db = await getAdminClient();
  const send = checked(await db.from("push_sends").insert({ actor_id: actor.id, category, message: { ...message, recipient: target, inApp: !testOnly, delivery }, test_only: testOnly }).select("id").single());
  return { id: send.id, message, category, testOnly, delivery, recipient: target, customer, inAppCustomers: testOnly ? 0 : recipients.length, customers: recipients.filter(r => r.subscriptionIds.length > 0).length, devices: recipients.reduce((sum, r) => sum + r.subscriptionIds.length, 0) };
}
async function loadSend(id: string) {
  const db = await getAdminClient();
  const send = checked(await db.from("push_sends").select("*").eq("id", id).single());
  if (!send) throw new Error("Send not found.");
  return send;
}
export async function confirm(actor: PushActor, id: string, explicitlyConfirmed: boolean) {
  requireOwner(actor);
  if (explicitlyConfirmed !== true) throw new Error("Explicit confirmation required.");
  const send = await loadSend(id);
  if (send.actor_id !== actor.id) throw new Error("Preview belongs to another owner.");
  const delivery = savedDelivery(send);
  requireSending(delivery === "in_app_push");
  const target = savedTarget(send);
  if (send.test_only && target.mode !== "all") throw new Error("Invalid test recipient.");
  if (send.status === "draft") {
    if (target.mode === "customer") await customerIdentity(target.customerId);
    const recipients = await audience(send.category, actor.id, send.test_only, target, send.message.inApp === true, delivery);
    if (target.mode === "customer" && !recipients.length) throw new Error("Selected customer is not eligible for this notification.");
    const audit = await recordAdminAuditEntry({ actionType: "push_send_confirmed", entityType: "push_send", entityId: id,
      summary: `Confirmed ${send.test_only ? "owner test" : send.category} push send. Fresh eligible customers: ${recipients.length}.` });
    if (!audit.ok) throw new Error("Audit recording failed; send not started.");
    const db = await getAdminClient();
    checked(await db.rpc(send.message.inApp === true && !send.test_only ? "push_confirm_inbox" : "push_confirm", { p_send: id, p_actor: actor.id, p_recipients: recipients }));
  }
  return dispatchBatch(actor, id);
}
async function stillEligible(send: any, delivery: any, sub: any) {
  if (savedDelivery(send) === "in_app_only") return false;
  const target = savedTarget(send);
  if (target.mode === "customer" && (send.test_only || sub?.user_id !== target.customerId || delivery.customer_id !== target.customerId)) return false;
  if (!sub?.active || sub.user_id !== delivery.customer_id || (sub.expires_at && new Date(sub.expires_at).getTime() <= Date.now())) return false;
  const db = await getAdminClient();
  const role = checked(await db.from("user_roles").select("role,account_state").eq("user_id", sub.user_id).maybeSingle());
  if (!role || role.account_state === "banned") return false;
  if (send.test_only) return sub.user_id === send.actor_id && role.role === "master_admin";
  if (role.role !== "customer" || !hasConsent(await preferences(sub.user_id), send.category)) return false;
  if (send.category === "invoices") {
    const due = new Set(dueCycleIds(await listActiveCycleContexts(sub.user_id), siteToday()));
    return delivery.cycle_ids.some((id: string) => due.has(id));
  }
  return true;
}
export async function dispatchBatch(actor: PushActor, id: string) {
  requireOwner(actor);
  const send = await loadSend(id);
  if (send.status !== "queued" || send.actor_id !== actor.id) throw new Error("Confirm your preview first.");
  savedTarget(send); // Reject malformed persisted targeting before claiming any delivery.
  const deliveryMode = savedDelivery(send);
  requireSending(deliveryMode === "in_app_push");
  // Never claim, retry or invoke a transport for an inbox-only send, even if a stale job exists.
  if (deliveryMode === "in_app_only") return sendResults(id);
  const db = await getAdminClient();
  // Await every delivery. No detached work, cron, or background campaigns.
  // Claim one at a time so a slow provider cannot strand an entire batch.
  const started = Date.now();
  for (let count = 0; count < 5 && Date.now() - started < 20000; count++) {
    const delivery = checked(await db.rpc("push_claim", { p_send: id }))?.[0];
    if (!delivery) break;
    const sub = checked(await db.from("push_subscriptions").select("*").eq("id", delivery.subscription_id).maybeSingle());
    let status = "skipped";
    let httpStatus: number | null = null;
    let retrySeconds = 60 * 2 ** (delivery.attempts - 1);
    if (await stillEligible(send, delivery, sub) && validEndpoint(sub.endpoint)) {
      const message: PushMessage = send.category === "invoices" ? PAYMENT_REMINDER : saleMessage(send.message);
      const agent = new Agent({ keepAlive: false });
      const deadline = setTimeout(() => agent.destroy(), 10000);
      try {
        const response = await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ ...message, tag: `fgd-${send.id}` }), {
            TTL: 3600, urgency: "normal", timeout: 8000, agent,
            vapidDetails: { subject: process.env.VAPID_SUBJECT!, publicKey: process.env.VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! },
          });
        status = "accepted";
        httpStatus = response.statusCode;
      } catch (error: any) {
        httpStatus = Number.isInteger(error?.statusCode) ? error.statusCode : null;
        status = deliveryOutcome(httpStatus ?? undefined, delivery.attempts);
        const retryAfter = error?.headers?.["retry-after"];
        if (retryAfter) {
          const seconds = /^\d+$/.test(String(retryAfter)) ? Number(retryAfter) : (Date.parse(retryAfter) - Date.now()) / 1000;
          if (Number.isFinite(seconds)) retrySeconds = Math.max(retrySeconds, seconds);
        }
        // Never persist/log provider bodies, headers, keys, or endpoints.
      } finally {
        clearTimeout(deadline);
        agent.destroy();
      }
    }
    checked(await db.from("push_deliveries").update({ status, http_status: httpStatus,
      ready_at: new Date(Date.now() + retrySeconds * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", delivery.id).eq("status", "sending"));
    // The database trigger atomically invalidates and records deduplicated alerts.
  }
  return sendResults(id);
}
export async function sendResults(id: string) {
  const deliveries = await rows("push_deliveries", "customer_id,status,ready_at,attempts", q => q.eq("send_id", id).order("id"));
  const counts: Record<string, number> = {};
  for (const row of deliveries) counts[row.status] = (counts[row.status] ?? 0) + 1;
  const inbox = await rows("customer_notifications", "id", q => q.eq("send_id", id).eq("kind", "message").order("id"));
  const failureAlerts = await rows("push_failure_alerts", "id,customer_id,kind,failed_count,remaining_devices,first_failed_at,provider_statuses", q => q.eq("send_id", id).order("id"));
  return { id, failureAlerts, attemptedDevices: deliveries.filter(r => r.attempts > 0 && !["pending", "sending", "skipped"].includes(r.status)).length, inAppCustomers: inbox.length, customers: new Set(deliveries.map(r => r.customer_id)).size, devices: deliveries.length, counts };
}
export async function recentSends() {
  const db = await getAdminClient();
  const sends = checked(await db.from("push_sends").select("id,category,test_only,created_at,status,message").eq("status", "queued").order("created_at", { ascending: false }).limit(10));
  return Promise.all(sends.map(async (send: any) => ({ ...send, ...await sendResults(send.id) })));
}
