import { resolveApprovalAction } from "@fatguydiscounts/core";

export function previewApprovalAction(nextState: "approved" | "claiming_disabled" | "banned") {
  return resolveApprovalAction("admin", nextState);
}

