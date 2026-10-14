const CACHE_NAME = "sgmy-trip-nav-v8";
const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://cdn.tailwindcss.com",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
  "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // クラウド同期APIへのリクエストはキャッシュせず直接ネットワークへ通す
  if (event.request.url.includes("/api/sync") || event.request.url.includes("script.google.com")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((netRes) => {
            if (netRes && netRes.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, netRes));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request)
        .then((netRes) => {
          if (!netRes || netRes.status !== 200) return netRes;
          const clone = netRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return netRes;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});