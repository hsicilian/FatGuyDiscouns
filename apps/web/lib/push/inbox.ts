import "server-only";
import { getAdminClient } from "../data/supabase-helpers";
import type { PushActor } from "./policy";
export type InboxNotification = { id: string; title: string; body: string; category: string; kind?: string; created_at: string };
export function requireInboxCustomer(actor: PushActor | null): asserts actor is PushActor {
  if (!actor || actor.role !== "customer" || actor.accountState === "banned") throw new Error("Customer access required.");
}
export async function listInbox(actor: PushActor | null, page = 0): Promise<InboxNotification[]> {
  requireInboxCustomer(actor);
  if (!Number.isSafeInteger(page) || page < 0 || page > 100000) throw new Error("Invalid page.");
  const db = await getAdminClient();
  const result = await db.from("customer_notifications").select("id,title,body,category,kind,created_at")
    .eq("customer_id", actor.id).is("deleted_at", null).order("created_at", { ascending: false }).order("id", { ascending: false })
    .range(page * 50, page * 50 + 49);
  if (result.error) throw new Error("Notifications unavailable.");
  return result.data ?? [];
}
export async function deleteInboxNotification(actor: PushActor | null, id: unknown) {
  requireInboxCustomer(actor);
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid notification.");
  const db = await getAdminClient();
  const result = await db.from("customer_notifications").update({ deleted_at: new Date().toISOString() })
    .eq("id", id).eq("customer_id", actor.id).is("deleted_at", null);
  if (result.error) throw new Error("Could not delete notification.");
}
