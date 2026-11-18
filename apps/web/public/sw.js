/* Push only: deliberately no fetch handler or offline cache. */
const NOTIFICATION_INBOX = "/account/notifications";

self.addEventListener("push", event => {
  let payload;
  try { payload = event.data?.json() || {}; } catch { payload = {}; }

  event.waitUntil(self.registration.showNotification(String(payload.title || "Fat Guy Discounts").slice(0, 80), {
    body: String(payload.body || "Visit FGD to view your notification.").slice(0, 240),
    icon: "/android-chrome-192x192.png",
    badge: "/notification-badge-fgd-96.png",
    tag: String(payload.tag || "fgd-notification"),
    // The push notification always opens FGD's in-app inbox. If the
    // message includes a show link, the customer clicks it INSIDE FGD.
    data: { url: NOTIFICATION_INBOX },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  // Ignore destinations supplied in old or new notification payloads.
  // Never auto-open customer-provided show links or external websites.
  const destination = new URL(NOTIFICATION_INBOX, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const sameOrigin = client => {
      try { return new URL(client.url).origin === self.location.origin; }
      catch { return false; }
    };

    const inbox = windows.find(client => {
      try {
        const url = new URL(client.url);
        return sameOrigin(client) && url.pathname === NOTIFICATION_INBOX;
      } catch { return false; }
    });
    if (inbox) {
      await inbox.focus();
      return;
    }

    const fgdWindow = windows.find(client => sameOrigin(client) && typeof client.navigate === "function");
    if (fgdWindow) {
      try {
        const navigated = await fgdWindow.navigate(destination);
        if (navigated) {
          await navigated.focus();
          return;
        }
      } catch {
        // The window may have closed or navigation may be unsupported.
        // Fall back to opening the inbox in a new app window.
      }
    }

    const opened = await self.clients.openWindow(destination);
    if (opened) await opened.focus();
  })());
});
