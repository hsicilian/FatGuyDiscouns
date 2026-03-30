"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormActionState } from "@fatguydiscounts/types";
import { assertProductionSupabaseReady, createServerSupabaseClient, hasSupabaseEnv, normalizeInternalRedirect } from "../../../lib/supabase";
import { authenticateLocalAccount } from "../../../lib/auth/session";
import { setActiveCustomer } from "../../../lib/data/local-db";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address.").trim(),
  password: z.string().min(1, "Enter your password."),
  redirectTo: z.string().default("/account"),
});

export async function loginWithLocalAccountAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  assertProductionSupabaseReady();
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    redirectTo: String(formData.get("redirectTo") ?? "/account"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Enter both email and password to sign in.",
      submittedAt: new Date().toISOString(),
    };
  }

  const { email, password, redirectTo } = parsed.data;
  const safeRedirect = normalizeInternalRedirect(redirectTo, "/account");

  if (!hasSupabaseEnv()) {
    const result = await authenticateLocalAccount(email, password);
    if (!result.ok) {
      return {
        ok: false,
        message: result.message,
        submittedAt: new Date().toISOString(),
      };
    }

    if (result.account.customerId) {
      await setActiveCustomer(result.account.customerId);
    }

    const nextLocation = result.account.role === "customer"
      ? safeRedirect
      : result.account.role === "master_admin"
        ? "/admin/reports"
        : "/admin";
    redirect(nextLocation);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      ok: false,
      message: error.message,
      submittedAt: new Date().toISOString(),
    };
  }

  const [{ data: userResult }, { data: roleRow }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("user_roles").select("role").single(),
  ]);

  const nextLocation = roleRow?.role === "master_admin"
    ? "/admin/reports"
    : roleRow?.role === "admin"
      ? "/admin"
      : safeRedirect;

  if (!userResult.user) {
    return {
      ok: false,
      message: "Sign-in completed but no user session was found.",
      submittedAt: new Date().toISOString(),
    };
  }

  redirect(nextLocation);
}
