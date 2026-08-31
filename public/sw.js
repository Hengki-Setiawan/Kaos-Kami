const CACHE_NAME = "kaos-kami-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/studio",
  "/manifest.json",
  "/favicon.ico",
  "/models/tshirt-heavyweight.glb",
];

// Install event: cache shell and key 3D assets
self.addEventListener("install", (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event: clean up stale caches
self.addEventListener("activate", (event: any) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Network-first for APIs, Cache-first for 3D GLB models & static images
self.addEventListener("fetch", (event: any) => {
  const url = new URL(event.request.url);

  // APIs and auth must ALWAYS be fresh network-first
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/orders/")) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 3D models and static assets cache-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.endsWith(".glb") || url.pathname.endsWith(".png") || url.pathname.endsWith(".css"))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

export {};
