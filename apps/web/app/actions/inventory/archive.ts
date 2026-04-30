"use server";

import type { FormActionState } from "@fatguydiscounts/types";
import { archiveProduct, deleteArchivedProduct, restoreArchivedProduct } from "../../../lib/actions/server";

export async function manageArchivedProductAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const productId = String(formData.get("productId") ?? "");
  const mode = String(formData.get("mode") ?? "archive");

  if (mode === "restore") {
    return restoreArchivedProduct(productId);
  }

  if (mode === "delete") {
    return deleteArchivedProduct(productId);
  }

  return archiveProduct(productId);
}
