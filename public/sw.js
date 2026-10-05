// Retired PWA worker. An earlier caching version of this file pinned clients to the
// app shell it cached at install time, so after a deploy they kept running the old
// bundle. This build clears every cache and unregisters itself; it deliberately does
// not force-navigate open tabs (that could compound into a reload loop) — the next
// load simply runs the current bundle.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
    })(),
  );
});
