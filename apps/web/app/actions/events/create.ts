"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { createEvent } from "../../../lib/actions/server";

export async function createEventAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return createEvent(
    String(formData.get("title") ?? ""),
    String(formData.get("startsAtLocal") ?? ""),
    String(formData.get("description") ?? ""),
    String(formData.get("externalLink") ?? ""),
    String(formData.get("platform") ?? ""),
    String(formData.get("timeZone") ?? "America/New_York"),
    formData.get("repeatWeekly") === "on",
    String(formData.get("repeatUntilLocal") ?? ""),
  );
}
