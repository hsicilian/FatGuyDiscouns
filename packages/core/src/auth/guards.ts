import type { AccountState, UserRole } from "@fatguydiscounts/types";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  accountState: AccountState;
}

export interface RouteAccessResult {
  allowed: boolean;
  redirectTo?: string;
}

export function requireCustomerSession(user: SessionUser | null): RouteAccessResult {
  if (!user) {
    return { allowed: false, redirectTo: "/login" };
  }

  if (user.role !== "customer") {
    return { allowed: false, redirectTo: user.role === "admin" || user.role === "master_admin" ? "/admin" : "/" };
  }

  if (user.accountState === "banned") {
    return { allowed: false, redirectTo: "/login" };
  }

  return { allowed: true };
}

export function requireApprovedClaiming(user: SessionUser | null): RouteAccessResult {
  if (!user) {
    return { allowed: false, redirectTo: "/login" };
  }

  if (user.role !== "customer") {
    return { allowed: false, redirectTo: user.role === "admin" || user.role === "master_admin" ? "/admin" : "/" };
  }

  if (user.accountState !== "approved") {
    return { allowed: false, redirectTo: "/account" };
  }

  return { allowed: true };
}

export function requireAdminSession(user: SessionUser | null): RouteAccessResult {
  if (!user) {
    return { allowed: false, redirectTo: "/login" };
  }

  if (user.accountState === "banned") {
    return { allowed: false, redirectTo: "/login" };
  }

  if (user.role !== "admin" && user.role !== "master_admin") {
    return { allowed: false, redirectTo: "/" };
  }

  return { allowed: true };
}

export function requireMasterAdminSession(user: SessionUser | null): RouteAccessResult {
  if (!user) {
    return { allowed: false, redirectTo: "/login" };
  }

  if (user.accountState === "banned") {
    return { allowed: false, redirectTo: "/login" };
  }

  if (user.role !== "master_admin") {
    return { allowed: false, redirectTo: "/admin" };
  }

  return { allowed: true };
}
