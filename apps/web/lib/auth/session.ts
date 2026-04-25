import { cookies } from "next/headers";
import type { SessionUser } from "@fatguydiscounts/core";
import { assertProductionSupabaseReady, createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseEnv } from "../supabase";

export interface SessionAccount {
  id: string;
  displayName: string;
  email: string;
  role: SessionUser["role"];
  accountState: SessionUser["accountState"];
  customerId?: string;
}

export const sessionCookieName = "fatguydiscounts-session";

export async function listSessionAccounts() {
  assertProductionSupabaseReady();
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase configuration is required for session access.");
  }
  return [] as SessionAccount[];
}

async function getSupabaseSessionAccount(): Promise<SessionAccount | null> {
  const supabase = await createServerSupabaseClient();
  const { data: userResult } = await supabase.auth.getUser();

  const user = userResult.user;
  if (!user) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const [{ data: roleRow }, { data: profileRow }] = await Promise.all([
    admin.from("user_roles").select("role, account_state").eq("user_id", user.id).maybeSingle(),
    admin.from("customer_profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
  ]);

  const displayName = profileRow?.display_name
    ?? (typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : null)
    ?? user.email
    ?? "Fatguydiscounts User";

  const role = roleRow?.role ?? "customer";
  const accountState = roleRow?.account_state ?? "pending_approval";

  return {
    id: user.id,
    customerId: role === "customer" ? user.id : undefined,
    displayName,
    email: user.email ?? "",
    role,
    accountState,
  };
}

export async function getCurrentSessionAccount(): Promise<SessionAccount | null> {
  assertProductionSupabaseReady();
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase configuration is required for session access.");
  }
  return getSupabaseSessionAccount();
}

export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  const account = await getCurrentSessionAccount();

  if (!account) {
    return null;
  }

  return {
    id: account.customerId ?? account.id,
    email: account.email,
    displayName: account.displayName,
    role: account.role,
    accountState: account.accountState,
  };
}
