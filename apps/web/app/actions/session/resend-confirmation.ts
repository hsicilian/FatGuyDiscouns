"use server";

import { z } from "zod";
import type { FormActionState } from "@fatguydiscounts/types";
import { assertProductionSupabaseReady, createServerSupabaseClient, getSiteUrl, hasSupabaseEnv } from "../../../lib/supabase";

const resendConfirmationSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export async function resendConfirmationAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  assertProductionSupabaseReady();
  const parsed = resendConfirmationSchema.safeParse({
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
      ok: false,
      message: "Confirmation resend requires Supabase auth to be configured.",
      submittedAt: new Date().toISOString(),
    };
  }

  const supabase = await createServerSupabaseClient();
  const emailRedirectTo = `${getSiteUrl()}/auth/callback`;
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
      submittedAt: new Date().toISOString(),
    };
  }

  return {
    ok: true,
    message: "If that account is awaiting email confirmation, a new confirmation email has been sent.",
    submittedAt: new Date().toISOString(),
  };
}
