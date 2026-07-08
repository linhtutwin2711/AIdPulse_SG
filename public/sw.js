/* AidPulse SG service worker — receives Web Push broadcasts and shows them as
   system notifications (lock screen on phones). Kept cache-free on purpose:
   its only job is push. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "AidPulse SG Alert";
  const options = {
    body: data.body || "Emergency broadcast — open AidPulse for details.",
    icon: "/pwa/icon-192.png",
    badge: "/pwa/icon-192.png",
    tag: data.tag || "aidpulse-broadcast", // same tag → newer alert replaces older
    renotify: true,
    data: { url: data.url || "/dashboard" },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Only same-origin relative paths — a payload can't navigate users off-site.
  const raw = event.notification.data?.url;
  const url =
    typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")
      ? raw
      : "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
