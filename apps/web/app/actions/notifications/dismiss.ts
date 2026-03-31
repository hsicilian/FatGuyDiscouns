"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { dismissNotification } from "../../../lib/actions/server";

export async function dismissNotificationAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const notificationId = String(formData.get("notificationId") ?? "");
  return dismissNotification(notificationId);
}
