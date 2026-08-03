# Pupil Detector — cổng JS (OpenCV.js)

Cổng JavaScript trung thực của **`OrloskyPupilDetector.py`** (repo `JEOresearch/EyeTracker`, giấy phép MIT — giữ nguyên giấy phép gốc, đây là bản dịch ngôn ngữ, không phải tác phẩm phái sinh thay thế).

## Vì sao giữ được "độ chính xác tương tự"

Bản gốc dùng OpenCV-Python (`cv2`) xử lý ảnh bằng các phép toán rời rạc, xác định: ngưỡng nhị phân, giãn nở hình thái học (dilate), tìm contour, fit ellipse, đo độ phủ pixel. Không có mạng nơ-ron nào cả — toàn bộ là thuật toán hình học/thống kê cổ điển. OpenCV.js dùng **cùng thư viện lõi C++ OpenCV**, chỉ khác lớp bọc ngôn ngữ, nên với cùng tham số, kết quả phải tương đương pixel-cho-pixel với bản Python, không phải một phiên bản "viết lại theo tinh thần tương tự".

`pupil-detector.js` giữ nguyên tên hàm và cấu trúc song song với file `.py` gốc để đối chiếu trực tiếp từng dòng. Có đúng 2 khác biệt cố ý, đã ghi chú tại chỗ trong code:
1. Gộp việc chuyển ảnh xám (bản gốc làm 2 lần do gọi hàm lồng nhau, ở đây làm 1 lần) — không đổi kết quả.
2. Trả `null` khi không tìm được ellipse hợp lệ, thay vì rotated-rect toàn số 0 như bản gốc — an toàn hơn cho code JS gọi nó.

Không có tham số xử lý ảnh nào (ngưỡng, kernel, tỉ lệ diện tích...) bị đổi.

## ⚠️ Lưu ý quan trọng trước khi thử với webcam thường

Theo đúng README gốc của tác giả: **thuật toán này giả định ảnh đầu vào là cận cảnh TOÀN BỘ mắt** (thường từ camera hồng ngoại gắn trong kính VR hoặc kính tự chế, giống `eye_test.mp4` đi kèm repo gốc) — không phải ảnh khuôn mặt đầy đủ từ webcam laptop thông thường. Nếu trỏ webcam bình thường vào cả khuôn mặt, vùng mắt sẽ quá nhỏ/không đủ tối để `get_darkest_area` + ngưỡng nhị phân hoạt động đúng như thiết kế.

Vì vậy demo này **đúng với đúng loại input mà thuật toán được thiết kế cho** (cận cảnh mắt), nhưng nếu bạn thử bằng webcam laptop trỏ cả khuôn mặt, đừng ngạc nhiên nếu không tìm được pupil tốt — đó không phải lỗi port, mà là đúng giới hạn của bản gốc.

Repo gốc có 2 hướng giải quyết việc này mà **chưa được port ở đây**:
- `FrontCameraTracker/Orlosky3DEyeTrackerFrontCamera.py` — biến thể cho camera ngoài.
- `Webcam3DTracker/MonitorTracking.py` — bản dùng webcam thường, có vẻ tự định vị/crop vùng mắt trước khi xử lý (chưa đọc kỹ để xác nhận).

Nếu bạn muốn dùng được với webcam thường trỏ cả mặt, bước tiếp theo hợp lý là: dùng MediaPipe Face Mesh (đã có sẵn bản JS, cùng CDN quen thuộc như trong HandScope) để định vị + crop vùng mắt trước, rồi đưa crop đó vào `detectPupil()` ở đây — chưa làm, cần bạn xác nhận có muốn hướng này không.

## Cách chạy demo
```
npx serve .
```
Mở `demo.html`, cho quyền camera. Để kiểm chứng độ chính xác đúng nghĩa, nên thử với video/camera cận cảnh mắt (giống `eye_test.mp4` của repo gốc) thay vì webcam trỏ cả mặt.

## API

```js
const result = PupilDetector.detectPupil(cv, colorMat, { width: 640, height: 480 });
// result = { center:{x,y}, size:{width,height}, angle, darkestPoint, cropSize } | null
```
`colorMat` là một `cv.Mat` màu bất kỳ kích thước nào (ví dụ từ `cv.imread(canvas)`) — hàm tự crop theo tỉ lệ 4:3 và resize về `width x height` giống hệt `crop_to_aspect_ratio` bản gốc.
