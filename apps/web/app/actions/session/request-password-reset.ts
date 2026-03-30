"use server";

import { z } from "zod";
import type { FormActionState } from "@fatguydiscounts/types";
import { assertProductionSupabaseReady, createServerSupabaseClient, getSiteUrl, hasSupabaseEnv } from "../../../lib/supabase";

const requestResetSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export async function requestPasswordResetAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  assertProductionSupabaseReady();
  const parsed = requestResetSchema.safeParse({
    email: String(formData.get("email") ?? ""),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
      submittedAt: new Date().toISOString(),
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      message: "Password reset emails are enabled when Supabase auth is configured.",
      submittedAt: new Date().toISOString(),
    };
  }

  const supabase = await createServerSupabaseClient();
  const redirectTo = `${getSiteUrl()}/auth/callback?next=/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  if (error) {
    return {
      ok: false,
      message: error.message,
      submittedAt: new Date().toISOString(),
    };
  }

  return {
    ok: true,
    message: "If that email exists, a password reset link has been sent.",
    submittedAt: new Date().toISOString(),
  };
}
