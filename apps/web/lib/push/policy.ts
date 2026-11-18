export type PushCategory = "sales" | "invoices" | "general";
export const PAYMENT_REMINDER = {
  title: "FGD Payment Reminder",
  body: "You have an outstanding balance with Fat Guy Discounts. Please visit your account to review your balance and payment options.",
  url: "/account",
};
export type PushMessage = typeof PAYMENT_REMINDER;
export type PushActor = { id: string; role: string; accountState: string };
export function canManagePush(actor: PushActor | null): boolean {
  return !!actor && actor.role === "master_admin" && actor.accountState !== "banned";
}
export function hasConsent(preferences: { sales?: boolean; invoices?: boolean } | null, category: PushCategory) {
  return category !== "general" && preferences?.[category] === true;
}
// Amounts come exclusively from listActiveCycleContexts; no billing math here.
export function dueCycleIds(contexts: { summary: { id: string; status: string; dueDate: string }; due: number }[], today: string) {
  return contexts.filter(({ summary, due }) => summary.status === "active" && Number.isFinite(due) && due > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(summary.dueDate) && summary.dueDate <= today).map(({ summary }) => summary.id);
}
export function safeDestination(value: unknown) {
  // Sale announcements do not require navigation. Keep approved legacy links valid.
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.length > 300 || !/^\/(?:store(?:\/[A-Za-z0-9_-]+)?|events|account)?$/.test(value)) {
    throw new Error("Choose /, /store, /store/product-id, /events, or /account.");
  }
  return value;
}
export function saleMessage(input: { title?: unknown; body?: unknown; url?: unknown }): PushMessage {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!title || title.length > 80 || !body || body.length > 240 || /[\u0000-\u001f]/.test(title + body)) {
    throw new Error("Use a title of 1–80 characters and a message of 1–240 characters.");
  }
  return { title, body, url: safeDestination(input.url) };
}
export function validEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return endpoint.length <= 2048 && url.protocol === "https:" && !url.port && !url.username && !url.password && !url.hash &&
      (url.hostname === "fcm.googleapis.com" || url.hostname === "updates.push.services.mozilla.com" ||
        url.hostname === "web.push.apple.com" || /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname));
  } catch { return false; }
}
export function deliveryOutcome(status: number | undefined, attempt: number) {
  if (status === 404 || status === 410) return "expired";
  // Retry only explicit rejections. Network timeouts have ambiguous acceptance.
  if ((status === 429 || status === 503) && attempt < 3) return "retry";
  return status ? "failed" : "unknown";
}

export type PushTarget = { mode: "all" } | { mode: "customer"; customerId: string };
export function pushTarget(value: unknown): PushTarget {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Choose recipients explicitly.");
  const target = value as Record<string, unknown>;
  if (target.mode === "all" && target.customerId === undefined) return { mode: "all" };
  if (target.mode === "customer" && typeof target.customerId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target.customerId)) {
    return { mode: "customer", customerId: target.customerId.toLowerCase() };
  }
  throw new Error("Choose one valid customer or all customers.");
}

export type DeliveryMode = "in_app_only" | "in_app_push";
export function deliveryMode(value: unknown, category: PushCategory): DeliveryMode {
  if (value !== "in_app_only" && value !== "in_app_push") throw new Error("Choose a delivery mode explicitly.");
  if (category === "general" && value !== "in_app_only") throw new Error("General Updates are in-app only.");
  return value;
}
