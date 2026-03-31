"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { sendCustomerMessage } from "../../../lib/actions/server";

export async function sendCustomerMessageAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const message = String(formData.get("message") ?? "");
  return sendCustomerMessage(message);
}
