"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasSupabaseEnv, createServerSupabaseClient } from "../../../lib/supabase";
import { sessionCookieName } from "../../../lib/auth/session";

export async function logoutSessionAction() {
  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
  cookieStore.delete("fatguydiscounts-role");
  redirect("/login");
}
