let synchronization: Promise<void> = Promise.resolve();

export function synchronizePushAccount(userId: string | null) {
  // Logout, session expiry and Auth errors never remove enrollment or its marker.
  if (!userId) return synchronization;
  synchronization = synchronization.catch(() => {}).then(async () => {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    const response = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "reconcile", subscription: sub?.toJSON() ?? null }) });
    if (!response.ok) throw new Error("Could not check notification enrollment. Please try again.");
    const state = await response.json();
    // Only a server-confirmed different owner permits account-switch teardown.
    if (state.switched && sub) await sub.unsubscribe();
    // The marker is informational, not an ownership or unsubscribe decision.
    try { localStorage.setItem("fgd-push-account", userId); } catch { /* Storage may be unavailable. */ }
  });
  return synchronization;
}
