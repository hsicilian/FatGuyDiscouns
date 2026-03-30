"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormActionState } from "@fatguydiscounts/types";
import { assertProductionSupabaseReady, createServerSupabaseClient, getSiteUrl, hasSupabaseEnv } from "../../../lib/supabase";
import { createStoredCustomerAccount, hasStoredAccountWithEmail } from "../../../lib/auth/local-auth-store";
import { createPendingCustomerProfile, removeCustomerProfileById, setActiveCustomer } from "../../../lib/data/local-db";

const signupSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Use a password with at least 8 characters."),
  address: z.string().trim().min(5, "Enter your mailing address."),
  timezone: z.string().trim().min(1, "Choose a timezone."),
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
    address: String(formData.get("address") ?? ""),
    timezone: String(formData.get("timezone") ?? "America/New_York"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Complete all required fields.",
      submittedAt: new Date().toISOString(),
    };
  }

  const { displayName, email, password, address, timezone } = parsed.data;

  if (!hasSupabaseEnv()) {
    if (await hasStoredAccountWithEmail(email)) {
      return {
        ok: false,
        message: "An account with that email already exists.",
        submittedAt: new Date().toISOString(),
      };
    }

    const customerResult = await createPendingCustomerProfile({
      displayName,
      email,
      address,
      timezone,
    });

    if (!customerResult.ok) {
      return {
        ok: false,
        message: customerResult.message,
        submittedAt: new Date().toISOString(),
      };
    }

    const accountResult = await createStoredCustomerAccount({
      displayName,
      email,
      password,
      customerId: customerResult.customer.id,
    });

    if (!accountResult.ok) {
      await removeCustomerProfileById(customerResult.customer.id);
      return {
        ok: false,
        message: accountResult.message,
        submittedAt: new Date().toISOString(),
      };
    }

    await setActiveCustomer(customerResult.customer.id);
    redirect("/account");
  }

  const supabase = await createServerSupabaseClient();
  const callbackUrl = `${getSiteUrl()}/auth/callback`;
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: {
        display_name: displayName,
        address,
        timezone,
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

  return {
    ok: true,
    message: "Account created. Check your email to verify the account before signing in. After verification, an admin still needs to approve claiming access.",
    submittedAt: new Date().toISOString(),
  };
}
