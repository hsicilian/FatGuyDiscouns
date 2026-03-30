"use server";

import { z } from "zod";
import type { FormActionState } from "@fatguydiscounts/types";
import { assertProductionSupabaseReady, createServerSupabaseClient, hasSupabaseEnv } from "../../../lib/supabase";

const updatePasswordSchema = z.object({
  password: z.string().min(8, "Use a password with at least 8 characters."),
});

export async function updatePasswordAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  assertProductionSupabaseReady();
  const parsed = updatePasswordSchema.safeParse({
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Enter a valid password.",
      submittedAt: new Date().toISOString(),
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: false,
      message: "Password updates require Supabase auth to be configured.",
      submittedAt: new Date().toISOString(),
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return {
      ok: false,
      message: error.message,
      submittedAt: new Date().toISOString(),
    };
  }

  return {
    ok: true,
    message: "Password updated successfully. You can continue with the current session.",
    submittedAt: new Date().toISOString(),
  };
}
