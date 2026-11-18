"use client";
import { useEffect } from "react";
import { synchronizePushAccount } from "./browser-account";

// Reconcile confirmed account switches; signed-out sessions preserve enrollment.
export function PushAccountBoundary({ userId }: { userId: string | null }) {
  useEffect(() => {
    synchronizePushAccount(userId).catch(() => { /* No credentials or provider errors in browser logs. */ });
  }, [userId]);
  return null;
}
