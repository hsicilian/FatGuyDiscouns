import { cookies } from "next/headers";
import type { SessionUser } from "@fatguydiscounts/core";
import { assertProductionSupabaseReady, createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseEnv } from "../supabase";
import { listStoredAccounts } from "./local-auth-store";

export interface SessionAccount {
  id: string;
  displayName: string;
  email: string;
  role: SessionUser["role"];
  accountState: SessionUser["accountState"];
  customerId?: string;
}

export const sessionCookieName = "fatguydiscounts-session";

function shouldUseSupabase() {
  assertProductionSupabaseReady();
  return hasSupabaseEnv();
}

async function listLocalSessionAccounts() {
  const accounts = await listStoredAccounts();
  return accounts.map(({ password, ...account }) => account);
}

async function getLocalSessionAccount(): Promise<SessionAccount | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookieName)?.value;

  if (!sessionId) {
    return null;
  }

  const accounts = await listStoredAccounts();
  const account = accounts.find((entry) => entry.id === sessionId);
  if (!account) {
    return null;
  }

  const { password, ...safeAccount } = account;
  return safeAccount;
}

export async function listSessionAccounts() {
  if (shouldUseSupabase()) {
    return [] as SessionAccount[];
  }

  return listLocalSessionAccounts();
}

export async function authenticateLocalAccount(email: string, password: string) {
  assertProductionSupabaseReady();
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = await listStoredAccounts();
  const account = accounts.find((entry) => entry.email.toLowerCase() === normalizedEmail);

  if (!account || account.password !== password) {
    return { ok: false as const, message: "Email or password did not match a local account." };
  }

  if (account.accountState === "banned") {
    return { ok: false as const, message: "This account has been banned and cannot sign in." };
  }

  const { password: _password, ...safeAccount } = account;
  return { ok: true as const, message: "Signed in successfully.", account: safeAccount };
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
  if (!shouldUseSupabase()) {
    return getLocalSessionAccount();
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
    role: account.role,
    accountState: account.accountState,
  };
}
