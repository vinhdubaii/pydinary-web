const CACHE_VERSION = "pydinary-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Core shell — cần có để app mở được (kể cả khi offline)
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/app.js",
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

  // Audio (Cloudinary) — không can thiệp.
  // Trình duyệt phát nhạc bằng Range request và nhận về 206 Partial Content;
  // Cache API không lưu được 206, nên nếu cố cache sẽ vừa tốn dung lượng
  // vừa làm hỏng tua bài. Để browser tự stream là đúng nhất.
  if (url.hostname.includes("cloudinary.com") || req.destination === "audio") {
    return;
  }

  // HTML / điều hướng — network-first.
  // Trước đây nhánh này là cache-first nên index.html bị "đóng băng":
  // deploy bản mới mà máy cũ vẫn chạy bản cũ cho tới khi xoá cache thủ công.
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put("/index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  // style.css / app.js — network-first luôn, cùng lý do như trên.
  if (url.origin === self.location.origin && /\.(css|js)$/.test(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
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

  // Ảnh bìa (img/) và lời bài hát (data/lyrics/*.lrc) — cache-first,
  // gần như không bao giờ đổi nội dung mà chỉ thêm file mới
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/img/") || url.pathname.endsWith(".lrc"))
  ) {
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

  // Còn lại (manifest, icon...) — cache-first, fallback network
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
