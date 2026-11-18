import "server-only";
import { getCurrentSessionUser } from "../auth/session";
import { getAdminClient } from "../data/supabase-helpers";
import { canManagePush } from "./policy";
import { summarizeSubscribers } from "./subscriber-summary";

// Owner-only, read-only, minimal columns: never return endpoints or subscription keys.
export async function readNotificationSubscribers(customerId?: string) {
  if (!canManagePush(await getCurrentSessionUser())) throw new Error("Owner access required.");
  const db = await getAdminClient();
  async function read(table: string, columns: string, order: string) {
    const result: any[] = [];
    for (let offset = 0; ; offset += 500) {
      let query = db.from(table).select(columns).order(order);
      if (customerId) query = query.eq("user_id", customerId);
      const { data, error } = await query.range(offset, offset + 499);
      if (error || !data) throw new Error("Phone notification information is unavailable. Reload to try again.");
      result.push(...data);
      if (data.length < 500) return result;
    }
  }
  const [customers, profiles, preferences, subscriptions] = await Promise.all([
    read("user_roles", "user_id,role,account_state", "user_id"),
    read("customer_profiles", "user_id,display_name", "user_id"),
    read("push_preferences", "user_id,sales,invoices", "user_id"),
    read("push_subscriptions", "id,user_id,active,expires_at", "id"),
  ]);
  return summarizeSubscribers(customers, profiles, preferences, subscriptions);
}
