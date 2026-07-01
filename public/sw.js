// xSyna Central – Notification Service Worker (Push + basic sync)
// No offline caching. Only push notifications + click-to-focus.
// Registration is guarded on the client (only PROD, non-preview).

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "xSyna", body: "Neue Nachricht", url: "/" };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch { /* ignore */ }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-512.png",
      badge: "/icon-512.png",
      data: { url: payload.url || "/" },
      tag: payload.tag || "xsyna-generic",
      renotify: false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) { c.focus(); if ("navigate" in c) c.navigate(url); return; }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
