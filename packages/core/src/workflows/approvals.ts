import type { AccountState, UserRole } from "@fatguydiscounts/types";

export interface ApprovalActionResult {
  nextState: AccountState;
  allowed: boolean;
}

export function resolveApprovalAction(role: UserRole, nextState: AccountState): ApprovalActionResult {
  const allowed = role === "admin" || role === "master_admin";
  return {
    nextState,
    allowed,
  };
}

export function canPromoteToAdmin(role: UserRole) {
  return role === "master_admin";
}

