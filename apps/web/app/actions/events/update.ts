"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { updateEvent } from "../../../lib/actions/server";

export async function updateEventAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return updateEvent(
    String(formData.get("eventId") ?? ""),
    String(formData.get("title") ?? ""),
    String(formData.get("startsAtLocal") ?? ""),
    String(formData.get("description") ?? ""),
    String(formData.get("externalLink") ?? ""),
    String(formData.get("platform") ?? ""),
    String(formData.get("timeZone") ?? "America/New_York"),
  );
}
