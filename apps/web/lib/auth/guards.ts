import { redirect } from "next/navigation";
import {
  requireAdminSession,
  requireApprovedClaiming,
  requireCustomerSession,
  requireMasterAdminSession,
} from "@fatguydiscounts/core";
import { getCurrentSessionUser } from "./session";

export async function ensureCustomerAccess() {
  const result = requireCustomerSession(await getCurrentSessionUser());
  if (!result.allowed && result.redirectTo) {
    redirect(result.redirectTo);
  }
}

export async function ensureClaimAccess() {
  const result = requireApprovedClaiming(await getCurrentSessionUser());
  if (!result.allowed && result.redirectTo) {
    redirect(result.redirectTo);
  }
}

export async function ensureAdminAccess() {
  const result = requireAdminSession(await getCurrentSessionUser());
  if (!result.allowed && result.redirectTo) {
    redirect(result.redirectTo);
  }
}

export async function ensureMasterAdminAccess() {
  const result = requireMasterAdminSession(await getCurrentSessionUser());
  if (!result.allowed && result.redirectTo) {
    redirect(result.redirectTo);
  }
}

