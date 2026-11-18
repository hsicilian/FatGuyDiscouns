"use server";
import { revalidatePath } from "next/cache";
import type { FormActionState } from "@fatguydiscounts/types";
import { getCurrentSessionUser } from "../../../lib/auth/session";
import { getAdminClient } from "../../../lib/data/supabase-helpers";

export async function addAccountCreditAction(_state: FormActionState, form: FormData): Promise<FormActionState> {
  const actor = await getCurrentSessionUser();
  if (!actor || actor.role !== "master_admin" || actor.accountState === "banned") return { ok: false, message: "Owner access required." };
  const customer = String(form.get("customerId") ?? "");
  const request = String(form.get("requestId") ?? "");
  const amount = String(form.get("amount") ?? "").trim();
  const date = String(form.get("recordedAt") ?? "");
  const kind = String(form.get("kind") ?? "");
  const note = String(form.get("note") ?? "").trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(customer) || !uuid.test(request) || !/^\d{1,10}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 || Number(amount) > 9999999999.99 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date ||
      !["Shipping deposit", "Gift certificate", "Other"].includes(kind) || (kind === "Other" && !note) || note.length > 240) {
    return { ok: false, message: "Enter a positive amount with up to two decimal places, a valid record date, and a reason. Other credits require a note." };
  }
  try {
    const db = await getAdminClient();
    const { data, error } = await db.rpc("add_account_credit", { p_request: request, p_actor: actor.id, p_customer: customer, p_amount: amount, p_reason: kind + (note ? ` — ${note}` : ""), p_recorded_on: date });
    if (error || data?.saved !== true) return { ok: false, message: "Credit could not be confirmed. Retry this same submission; do not start a second credit. If it keeps failing, check credit history before continuing." };
    for (const route of ["/account", "/account/history", "/admin/customers", `/admin/customers/${customer}`, "/admin/payments", "/admin/reports"]) revalidatePath(route);
    return { ok: true, message: data.duplicate ? "This credit was already saved. No additional credit was added." : `$${Number(amount).toFixed(2)} account credit saved. ${kind}.`, submittedAt: new Date().toISOString() };
  } catch {
    return { ok: false, message: "Could not confirm the credit. Retry this same submission to avoid adding it twice." };
  }
}
