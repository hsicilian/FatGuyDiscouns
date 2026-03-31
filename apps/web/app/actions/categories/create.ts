"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { createCategory } from "../../../lib/actions/server";

export async function createCategoryAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return createCategory(String(formData.get("name") ?? ""));
}
