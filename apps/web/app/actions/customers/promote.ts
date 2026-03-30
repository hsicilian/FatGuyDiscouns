"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { promoteCustomerToAdmin } from "../../../lib/actions/server";
import { getCurrentSessionUser } from "../../../lib/auth/session";

export async function promoteCustomerToAdminAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const currentUser = await getCurrentSessionUser();

  if (!currentUser || currentUser.role !== "master_admin") {
    return {
      ok: false,
      message: "Only the master admin can promote users to admin.",
    };
  }

  const customerId = String(formData.get("customerId") ?? "");
  return promoteCustomerToAdmin(customerId);
}