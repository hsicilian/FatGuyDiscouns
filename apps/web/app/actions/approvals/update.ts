"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { updateApprovalState } from "../../../lib/actions/server";

export async function updateApprovalStateAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const customerId = String(formData.get("customerId") ?? "");
  const nextState = String(formData.get("nextState") ?? "approved") as "approved" | "claiming_disabled" | "banned";
  return updateApprovalState(customerId, nextState);
}