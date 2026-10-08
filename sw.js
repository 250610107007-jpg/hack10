const CACHE_NAME = "campuscompass-gecp-v3";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/college-gate.jpg",
  "/maps/gecp-aerial-3d.jpg",
  "/maps/floor-4-0.jpg",
  "/maps/floor-4-1.jpg",
  "/maps/floor-5-0.jpg",
  "/maps/floor-5-1.jpg",
  "/maps/floor-7-0.jpg",
  "/maps/floor-7-1.jpg",
  "/maps/floor-8-0.jpg",
  "/maps/floor-8-1.jpg"
];

// Install event: pre-cache core UI and map assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("PWA pre-cache notice:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event: clean up outdated caches
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

// Fetch event: network-first for API, cache-first with network fallback for assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Dynamic API calls: network first, offline json fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ 
          error: "Offline mode. Connected to local device cache.",
          offline: true 
        }), {
          headers: { "Content-Type": "application/json" },
          status: 503
        });
      })
    );
    return;
  }

  // App navigation & static resources
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // SPA Navigation fallback: serve index.html for page loads
        if (event.request.mode === "navigate") {
          const indexCached = await caches.match("/index.html") || await caches.match("/");
          if (indexCached) return indexCached;
        }

        return new Response("App is currently offline. Reconnect to campus network to sync.", {
          headers: { "Content-Type": "text/plain" }
        });
      })
  );
});
