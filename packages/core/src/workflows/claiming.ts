import type { AccountState, Product, ShipmentStatus, UserRole } from "@fatguydiscounts/types";
import { canClaim } from "../index";

export interface ClaimAttemptInput {
  role: UserRole;
  accountState: AccountState;
  availableQuantity: number;
  requestedQuantity: number;
}

export interface ClaimAttemptResult {
  ok: boolean;
  message: string;
}

export function validateClaimAttempt(input: ClaimAttemptInput): ClaimAttemptResult {
  if (!canClaim(input.role, input.accountState)) {
    return { ok: false, message: "Customer is not currently approved to claim items." };
  }

  if (input.requestedQuantity < 1) {
    return { ok: false, message: "Claim quantity must be at least 1." };
  }

  if (input.requestedQuantity > input.availableQuantity) {
    return { ok: false, message: "Claim quantity exceeds available inventory." };
  }

  return { ok: true, message: "Claim can proceed." };
}

export function deriveProductStatus(quantity: number, currentStatus: Product["status"]): Product["status"] {
  if (currentStatus === "archived" || currentStatus === "hidden" || currentStatus === "draft") {
    return currentStatus;
  }

  if (quantity <= 0) {
    return "out_of_stock";
  }

  if (quantity === 1) {
    return "low_stock";
  }

  return "active";
}

export function canRequestShipment(accountState: AccountState, shipmentStatus: ShipmentStatus) {
  return accountState === "approved" && shipmentStatus !== "in_progress";
}

