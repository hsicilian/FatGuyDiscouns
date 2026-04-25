"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormActionState } from "@fatguydiscounts/types";
import { assertProductionSupabaseReady, createServerSupabaseClient, getSiteUrl } from "../../../lib/supabase";
import { createSupabaseAdminClient } from "../../../lib/supabase";
import { sendAdminEmailNotification } from "../../../lib/admin-email";

const signupSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Use a password with at least 8 characters."),
});

export async function signUpLocalCustomerAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  assertProductionSupabaseReady();
  const parsed = signupSchema.safeParse({
    displayName: String(formData.get("displayName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Complete all required fields.",
      submittedAt: new Date().toISOString(),
    };
  }

  const { displayName, email, password } = parsed.data;

  const supabase = await createServerSupabaseClient();
  const callbackUrl = `${getSiteUrl()}/auth/callback`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
      submittedAt: new Date().toISOString(),
    };
  }

  const userId = data.user?.id;
  if (userId) {
    const admin = createSupabaseAdminClient();
    const existingNotification = await admin
      .from("notifications")
      .select("id")
      .eq("type", "pending_approval")
      .eq("customer_id", userId)
      .is("read_at", null)
      .maybeSingle();

    if (!existingNotification.error && !existingNotification.data) {
      await admin.from("notifications").insert({
        type: "pending_approval",
        customer_id: userId,
        payload: {
          label: `${displayName} is waiting for account approval.`,
          email,
        },
      });
      try {
        await sendAdminEmailNotification({
          subject: "Account approval needed",
          text: `${displayName} is waiting for account approval.\nEmail: ${email}`,
        });
      } catch {
        // Keep the in-app approval queue even if email delivery fails.
      }
    }
  }

  return {
    ok: true,
    message: "Account created. Check your email to verify the account before signing in. After approval, you can log in and finish your address and timezone on your dashboard.",
    submittedAt: new Date().toISOString(),
  };
}
