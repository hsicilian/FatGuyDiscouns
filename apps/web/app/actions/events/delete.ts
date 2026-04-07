"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { deleteEvent } from "../../../lib/actions/server";

export async function deleteEventAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return deleteEvent(String(formData.get("eventId") ?? ""));
}
