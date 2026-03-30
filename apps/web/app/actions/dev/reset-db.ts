"use server";

import { revalidatePath } from "next/cache";
import { resetLocalAuthDatabase } from "../../../lib/auth/local-auth-store";
import { resetLocalDatabase } from "../../../lib/data/local-db";
import { hasSupabaseEnv } from "../../../lib/supabase";

export async function resetLocalDatabaseAction() {
  if (hasSupabaseEnv()) {
    return;
  }

  await resetLocalDatabase();
  await resetLocalAuthDatabase();
  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/claims");
  revalidatePath("/account");
  revalidatePath("/account/history");
  revalidatePath("/admin");
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/claims");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/shipments");
  revalidatePath("/admin/reports");
  revalidatePath("/login");
  revalidatePath("/signup");
}
