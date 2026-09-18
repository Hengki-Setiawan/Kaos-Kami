const CACHE_NAME = "kaos-kami-cache-v10";

// Precache ONLY immutable 3D models and runtime assets (NEVER HTML pages!)
const STATIC_ASSETS = [
  "/manifest.json",
  "/favicon.ico",
  "/models/mannequin.glb",
  "/models/mannequin-tee.glb",
  "/models/mannequin-hoodie.glb",
  "/models/mannequin-longsleeve.glb",
  "/models/mannequin-sweater.glb",
  "/models/mannequin-pants.glb",
  "/models/mannequin-shorts.glb",
  "/models/mannequin-cap.glb",
  "/models/mannequin-jacket.glb",
  "/models/tee-basic.glb",
  "/models/tshirt-heavyweight.glb",
  "/models/longsleeve.glb",
  "/models/hoodie-blue.glb",
  "/models/sweater.glb",
  "/models/jacket.glb",
  "/models/cap.glb",
  "/models/pants.glb",
  "/models/shorts.glb",
  "/textures/cotton-jersey-nor_gl_512.jpg",
  "/textures/cotton-jersey-rough_512.jpg",
];

// Install event: cache 3D assets only
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event: clean up all old stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event:
// 1. Cross-origin requests -> DO NOT intercept (let browser load scripts naturally without CSP connect-src triggers)
// 2. Navigation (HTML) -> ALWAYS Network First (never serve stale index.html chunks!)
// 3. Next.js chunks (/_next/) -> ALWAYS Network directly
// 4. 3D GLB & textures -> Cache First
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Cross-origin requests (e.g. Duitku, Google Analytics, Cloudflare): let browser handle directly
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigation requests (HTML pages) and Next.js internal chunks: ALWAYS fresh network
  if (
    event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/orders/")
  ) {
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
          (url.pathname.endsWith(".glb") ||
            url.pathname.endsWith(".png") ||
            url.pathname.endsWith(".jpg") ||
            url.pathname.endsWith(".webp") ||
            url.pathname.endsWith(".wasm") ||
            url.pathname.endsWith(".css"))
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
