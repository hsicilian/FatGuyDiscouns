"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormActionState } from "@fatguydiscounts/types";
import { assertProductionSupabaseReady, createServerSupabaseClient, normalizeInternalRedirect } from "../../../lib/supabase";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address.").trim(),
  password: z.string().min(1, "Enter your password."),
  redirectTo: z.string().default("/account"),
});

function isUnconfirmedEmailError(message: string) {
  const normalized = message.trim().toLowerCase();
  return normalized.includes("email not confirmed")
    || normalized.includes("email not verified")
    || normalized.includes("signup requires a verified email");
}

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

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const unconfirmedEmail = isUnconfirmedEmailError(error.message);
    return {
      ok: false,
      message: unconfirmedEmail
        ? "This account still needs email confirmation before it can sign in. Use the resend confirmation option below."
        : error.message,
      submittedAt: new Date().toISOString(),
      suggestedEmail: unconfirmedEmail ? email : undefined,
    };
  }

  const [{ data: userResult }, { data: roleRow }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getUser().then(async ({ data }) => {
      const userId = data.user?.id;
      if (!userId) {
        return { data: null };
      }
      return supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    }),
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
