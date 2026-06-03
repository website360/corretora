// Minimal service worker — enables installing the app (PWA).
// Intentionally does NOT cache responses, to avoid serving stale CRM data.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A fetch handler must exist for installability; we just pass through to network.
self.addEventListener("fetch", () => {
  // no-op (browser handles the request normally)
});
