"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { addCustomerNote } from "../../../lib/actions/server";

export async function addCustomerNoteAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const customerId = String(formData.get("customerId") ?? "");
  const note = String(formData.get("note") ?? "");
  return addCustomerNote(customerId, note);
}