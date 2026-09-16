# Pydinary – Music Player

Trình phát nhạc web (PWA), chạy hoàn toàn tĩnh — không cần backend.
Nhạc stream từ Cloudinary, ảnh bìa và lời bài hát nằm ngay trong repo.

## Tính năng

- 4 màn hình: Trang chủ / Tìm kiếm / Playlist / Chi tiết playlist
- Mini player + trình phát toàn màn hình
- Nền aurora đổi màu theo ảnh bìa (trích palette bằng canvas + lọc HSL)
- Nền WebGL [Neat](https://neat.firecms.co/), tự fallback về blob CSS nếu WebGL lỗi
- Lời bài hát `.lrc` đồng bộ theo thời gian, bấm vào dòng để tua
- Lịch sử nghe gần đây lưu trong `localStorage`
- Service worker: mở được app khi offline

## Cấu trúc

```
index.html          Khung HTML
css/style.css       Toàn bộ CSS
js/app.js           Toàn bộ logic
service-worker.js   Cache / offline
manifest.json       PWA manifest
data/
  playlists_index.json   Danh sách playlist
  N_<id>.json            Từng playlist
  lyrics/<playlist>/<slug>.lrc
img/
  <playlist>/cover/cover.webp
  <playlist>/<slug>.webp
```

## Quy ước đặt tên (quan trọng)

Mọi tên file và thư mục dùng **slug**: chữ thường, chỉ `a-z 0-9 -`,
không dấu cách, không dấu nháy.

Đường dẫn lời bài hát được **suy ra** từ đường dẫn ảnh bìa:

```
img/madihu/co-em.webp  ->  data/lyrics/madihu/co-em.lrc
```

Nên tên file ảnh và tên file `.lrc` phải trùng nhau, nếu không lyrics sẽ không hiện.

## Thêm một playlist

1. Tạo `img/<id>/cover/cover.webp` và ảnh bìa từng bài.
2. Tạo `data/<N>_<id>.json`:

```json
{
  "id": "ten-playlist",
  "title": "Tên Playlist",
  "cover": "img/ten-playlist/cover/cover.webp",
  "tracks": [
    {
      "title": "Tên bài",
      "artist": "Nghệ sĩ",
      "src": "https://res.cloudinary.com/.../bai-hat.mp3",
      "art": "img/ten-playlist/ten-bai.webp"
    }
  ]
}
```

3. Thêm `{ "id": "...", "file": "..." }` vào `data/playlists_index.json`.
4. (Tuỳ chọn) Thêm `data/lyrics/ten-playlist/ten-bai.lrc`.

## Chạy thử

Phải chạy qua HTTP server, mở file trực tiếp sẽ lỗi `fetch`:

```bash
python3 -m http.server 8000
# hoặc: npx serve
```

Khi sửa `css/style.css` / `js/app.js` mà không thấy đổi: service worker đang giữ bản cũ.
Mở DevTools → Application → Service Workers → Unregister, hoặc tăng `CACHE_VERSION`
trong `service-worker.js`.

---

Dev: Laris
