"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { deleteCategory } from "../../../lib/actions/server";

export async function deleteCategoryAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return deleteCategory(String(formData.get("categoryId") ?? ""));
}
