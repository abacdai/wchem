# HandScope (standalone)

Bộ theo dõi tay bằng webcam, độc lập hoàn toàn — không còn phụ thuộc Sandboxels hay bất kỳ ứng dụng nào khác. Mở `index.html` (qua local server, không phải double-click) là chạy được ngay với một canvas demo vẽ/xóa bằng tay.

## Chạy thử
```
npx serve .
# hoặc
python3 -m http.server 8000
```
Mở địa chỉ được in ra, cho phép quyền camera, bấm "Khởi động camera".

## Cấu trúc

- `hand-bridge.js` — theo dõi tay (MediaPipe Tasks Vision HandLandmarker + One-Euro filter + hysteresis chụm/nhả), phát sự kiện chuột thật lên bất kỳ phần tử nào. **Không có logic ứng dụng nào ở đây.**
- `hand-bridge.css` — con trỏ ảo + ô camera nhỏ góc màn hình.
- `handscope-shell.js` / `handscope-shell.css` — giao diện "Kinetic Lab" (glassmorphism) + canvas demo vẽ màu bằng tay, chỉ để minh họa. Có thể xóa/thay bằng UI của riêng bạn.
- `index.html` — trang gộp 4 file trên, không có gì khác.

## Hai cử chỉ

- **Chụm ngón cái + trỏ** → mousedown/kéo (vẽ trong demo) hoặc bấm nút UI nếu đang trỏ vào đó
- **Nắm tay** → mousedown nút phải (xóa trong demo)

## Nhúng vào dự án khác

1. Copy `hand-bridge.js` + `hand-bridge.css` vào dự án của bạn.
2. Trước khi nạp `hand-bridge.js`, đặt phần tử bạn muốn "vẽ/tương tác chính xác" có id hoặc set:
   ```html
   <script>window.HANDSCOPE_TARGET_SELECTOR = '#your-canvas';</script>
   ```
   Mặc định là `#handscope-canvas`.
3. Không cần nạp script MediaPipe riêng — `hand-bridge.js` tự động import `@mediapipe/tasks-vision` từ CDN khi khởi động.
4. Gọi `window.HandScope.start()` khi người dùng bấm nút bắt đầu (không tự bật camera nếu bạn đặt `window.HAND_SCOPE_MANUAL_START = true` trước khi nạp file).
5. Nghe sự kiện `window.addEventListener('handscope:status', e => {...})` để lấy fps/cử chỉ/vị trí nếu cần hiển thị trạng thái.
6. Muốn chỉnh độ nhạy sống: `window.HandScope.setSensitivity(marginX, marginY)` và `window.HandScope.setPinchThresholds(enter, exit)`.

`handscope-shell.js` là ví dụ tham khảo cách dùng các API trên — không bắt buộc phải giữ nếu bạn tự làm UI riêng.
