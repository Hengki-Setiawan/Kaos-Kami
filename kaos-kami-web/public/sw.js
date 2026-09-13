const CACHE_NAME = "kaos-kami-cache-v3";
// M-sisa & P0-4: precache SEMUA model prod + decoder inti Draco.
// - GLB aktif: tshirt/longsleeve/hoodie-blue/jacket/sweater/cap draco & glb.
// - 4 decoder runtime three DRACOLoader.
// - 2 tekstur foto cotton-jersey 512px.
const STATIC_ASSETS = [
  "/",
  "/studio",
  "/manifest.json",
  "/favicon.ico",
  "/models/tshirt-heavyweight.draco.glb",
  "/models/tshirt-heavyweight.glb",
  "/models/longsleeve.draco.glb",
  "/models/longsleeve.glb",
  "/models/hoodie-blue.draco.glb",
  "/models/hoodie-blue.glb",
  "/models/jacket.glb",
  "/models/jacket.lod1.glb",
  "/decoders/draco/draco_decoder.js",
  "/decoders/draco/draco_wasm_wrapper.js",
  "/decoders/draco/draco_decoder.wasm",
  "/decoders/draco/draco_decoder_gltf.wasm",
  "/textures/cotton-jersey-nor_gl_512.jpg",
  "/textures/cotton-jersey-rough_512.jpg",
];

// Install event: cache shell and key 3D assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event: clean up stale caches
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

// Fetch event: Network-first for APIs, Cache-first for 3D GLB models & static images
self.addEventListener("fetch", (event) => {
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
          (url.pathname.endsWith(".glb") ||
            url.pathname.endsWith(".png") ||
            url.pathname.endsWith(".jpg") ||
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
