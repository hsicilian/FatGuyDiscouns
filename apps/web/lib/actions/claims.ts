import { validateClaimAttempt } from "@fatguydiscounts/core";
import { getCurrentCustomer, listProducts } from "../data/local-db";

export async function previewClaimAction(productId: string, requestedQuantity: number) {
  const [products, customer] = await Promise.all([listProducts(), getCurrentCustomer()]);
  const product = products.find((entry) => entry.id === productId);

  if (!product) {
    return { ok: false, message: "Product not found." };
  }

  return validateClaimAttempt({
    role: customer.role,
    accountState: customer.accountState,
    availableQuantity: product.quantity,
    requestedQuantity,
  });
}