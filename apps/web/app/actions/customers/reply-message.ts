"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { sendAdminCustomerReply } from "../../../lib/actions/server";

export async function replyToCustomerMessageAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const customerId = String(formData.get("customerId") ?? "");
  const message = String(formData.get("message") ?? "");
  return sendAdminCustomerReply(customerId, message);
}
