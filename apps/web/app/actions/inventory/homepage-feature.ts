"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { updateHomepageFeatured } from "../../../lib/actions/server";

export async function updateHomepageFeaturedAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const productId = String(formData.get("productId") ?? "");
  const featured = String(formData.get("featured") ?? "false") === "true";
  return updateHomepageFeatured(productId, featured);
}
