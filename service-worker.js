const CACHE_VERSION = "pydinary-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Core shell — cần có để app mở được (kể cả khi offline)
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("pydinary-") && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  // Audio (Cloudinary) — không can thiệp, để browser tự stream/tải, tránh chiếm dung lượng cache
  if (url.hostname.includes("cloudinary.com") || req.destination === "audio") {
    return;
  }

  // JSON data (data/*.json) — stale-while-revalidate: trả cache trước cho nhanh,
  // đồng thời âm thầm cập nhật lại từ mạng để lần sau có bản mới
  if (url.origin === self.location.origin && url.pathname.startsWith("/data/") && url.pathname.endsWith(".json")) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Ảnh cùng domain (img/) — cache-first, ảnh bìa hầu như không đổi
  if (url.origin === self.location.origin && url.pathname.startsWith("/img/")) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Còn lại (index.html, manifest, icon...) — cache-first, fallback network, có cập nhật lại cache
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, res.clone()));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
