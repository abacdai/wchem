# PROMPT BÀN GIAO: Nâng cấp kiến trúc Hand Tracking cho HandScope
---

## 1. Bối cảnh dự án

**HandScope** là một lớp theo dõi tay bằng webcam, độc lập, có thể nhúng vào bất kỳ trang web nào — không còn gắn với dự án Sandboxels cũ. Kiến trúc hiện tại (2 file JS, không build step):

- **Nhận diện tay:** MediaPipe Hands (bản legacy `@mediapipe/hands`, chạy WASM trong trình duyệt qua CDN), 1 tay, `modelComplexity: 1`.
- **Làm mượt:** bộ lọc One-Euro (adaptive theo tốc độ) áp cho 21 landmark.
- **Cử chỉ:** chụm ngón cái+trỏ (hysteresis 2 ngưỡng vào/ra, nay chỉnh được sống qua `HandScope.setPinchThresholds()`) = vẽ/kéo; nắm tay = xóa.
- **Điều khiển:** không mô phỏng vật lý riêng — phát sinh sự kiện chuột thật (`mousedown/mousemove/mouseup/click`) lên phần tử DOM do trang chủ chỉ định qua `window.HANDSCOPE_TARGET_SELECTOR`, để bất kỳ trang nào cũng dùng được logic tương tác có sẵn của chính nó.
- **Giao diện đi kèm:** lớp vỏ "Kinetic Lab" (glassmorphism) + một canvas demo vẽ màu bằng tay, chỉ để minh họa — có thể bỏ hoàn toàn nếu nhúng vào dự án khác.

## 2. Vấn đề thực tế đang gặp (nguyên văn từ người dùng)

1. Chuyển động tay không mượt, vẫn giật, FPS dao động 12–20.
2. Khó chọn/tương tác — tay lúc nhận lúc không.
3. Khi hơn nửa bàn tay ra khỏi khung hình (chỉ còn nửa tay hoặc 1 ngón), hệ thống không nhận, hoặc cố "vẽ lại" phần thiếu một cách méo mó — có nên tách nhận diện từng phần tay riêng biệt không?
4. Khi tay nghiêng/dốc xuống, mọi tương tác ngừng hoạt động.
5. Tay đang di chuyển thì hay bị mất dấu giữa chừng.
6. Đôi khi tay đã mở ra (nhả chụm) nhưng hệ thống vẫn coi là đang chụm.

**Ghi chú thêm (chưa cần làm ngay):** hướng tới trải nghiệm giống phòng thí nghiệm thật hơn (bàn thí nghiệm 3D nhỏ thay vì vật rơi thẳng xuống đáy khung hình) — chỉ để tham khảo cho tương lai, không phải yêu cầu của lần nâng cấp này.

## 3. Mục tiêu

Đưa độ chính xác/độ bền của hand tracking gần với mức trải nghiệm tay cầm VR (Quest/Vision Pro), trong giới hạn phần cứng là 1 webcam thường (được đề xuất thêm phần cứng rẻ nếu đáng giá).

## 4. Ràng buộc bắt buộc

- **`hand-bridge.js` phải giữ tính tổng quát** — không được gắn cứng lại vào bất kỳ ứng dụng cụ thể nào (đây chính là lý do tách khỏi Sandboxels lần này). Mọi tích hợp ứng dụng cụ thể (nếu có) phải nằm ở lớp ngoài (như `handscope-shell.js`), không sửa vào lõi tracking.
- Giữ nguyên API công khai đã có: `window.HandScope.start()`, `.setSensitivity()`, `.setPinchThresholds()`, sự kiện `handscope:status`.
- Được phép đổi kiến trúc xử lý tracking (kể cả chuyển ra ngoài trình duyệt) miễn là dữ liệu cuối cùng (landmark đã lọc, trạng thái cử chỉ) vẫn đưa vào được lớp web hiện tại qua cùng API hoặc tương đương.
- Không dùng benchmark/API/phiên bản package chưa xác minh — kiểm tra qua tài liệu chính thức trước khi khẳng định.

## 5. Đánh giá trung thực từng hướng đề xuất

### 5.1 Khả thi cao — nên ưu tiên

| Hướng | Vì sao khả thi | Nguồn kiểm chứng |
|---|---|---|
| **Chuyển engine tracking ra khỏi trình duyệt** (Python/OpenCV hoặc C++ native, stream landmark qua WebSocket cục bộ) | Giải quyết trực tiếp vấn đề #1 (FPS 12-20): MediaPipe WASM trong sandbox trình duyệt bị giới hạn bởi luồng chính JS. | Google xác nhận hand tracking khó do tự che khuất, thiếu tương phản — giới hạn nằm ở pipeline 2D đơn khung hình, không chỉ ở code ứng dụng. |
| **Nâng mô hình phát hiện tay** lên kiến trúc mạnh hơn BlazePalm mặc định (ví dụ WiLoR — YOLO localizer + ViT 3D reconstruction trên mô hình MANO) | Có số liệu so sánh trực tiếp: tỷ lệ phát hiện tăng từ 62.8% → 67.7%, tỷ lệ khung hình cho tọa độ dùng được tăng từ 59.9% → 64.8% trong điều kiện tay bị che một phần — đúng vấn đề #3. | arXiv 2603.11383, bảng so sánh WiLoR vs MediaPipe. |
| **Chuyển sang MediaPipe Tasks Vision (`HandLandmarker`)** thay `@mediapipe/hands` legacy | API mới hơn, bảo trì tích cực, GPU delegate tốt hơn, có Gesture Recognizer tích hợp sẵn. Nâng cấp rẻ, ít rủi ro dù không giải quyết triệt để vấn đề xoay tay. | `@mediapipe/tasks-vision` (npm), MediaPipe Solutions docs. |
| **Kết hợp cảm biến xoay riêng cho việc xoay/nghiêng tay** — dùng gyro của một bộ điều khiển rẻ (Joy-Con/PS4-PS5, ~10-30 USD cũ) hoặc gyro điện thoại làm nguồn dữ liệu XOAY, để camera chỉ cần lo phần NGÓN TAY | Đúng nguyên nhân vấn đề #4: camera 2D vốn kém ở việc ước lượng xoay/nghiêng, trong khi gyro phần cứng lại rất mạnh đúng ở việc đó — chia việc theo đúng sở trường từng cảm biến thay vì bắt 1 webcam làm hết. Đã có người tự làm thành công theo hướng này (dùng camera điện thoại cho ngón tay + PS4/PS5 controller cho xoay, chạy qua ALVR/SteamVR) — ổn định hơn hẳn khi chỉ dùng camera, dù còn drift khi dùng Joy-Con. | Tài liệu hướng dẫn tự làm "Webcam + Phone Hand Tracking in SteamVR with ALVR" (Glass VR driver + Open Gloves) — ghi rõ PS4/PS5 controller ổn định hơn Joy-Con, tracking ngón tay tốt nhưng xoay/drift vẫn là điểm yếu cần cảm biến ngoài hỗ trợ. |
| **Phần cứng hồng ngoại chuyên dụng: Leap Motion Controller (Ultraleap)** | Giải pháp phần cứng phù hợp nhất cho đúng vấn đề #3/#4/#5: 2 camera IR nhìn tay từ góc gần-stereo, độ trễ gần bằng 0, FOV 135°, tầm 80cm. Bản gốc tìm mua cũ ~30-50 USD. Có SDK Windows/Mac/Linux, tích hợp web qua `leapjs`/WebSocket. | docs.ultraleap.com, các trang bán hàng chính hãng. |
| **Gaze hỗ trợ chọn mục tiêu (WebGazer.js)** cho việc chọn menu/mục tiêu ở xa | Thư viện thật, chạy hoàn toàn trong trình duyệt bằng webcam thường. Độ chính xác công bố ~100-190px (2-4° góc nhìn) sau hiệu chỉnh — đủ cho việc chọn vùng/nút, không đủ để vẽ chính xác pixel. Có một dự án tự làm độc lập khác đã áp dụng đúng mô hình "mắt điều khiển con trỏ, tay chụm xác nhận" và báo cáo hoạt động được (dù là bằng chứng kiểu proof-of-concept, không phải nghiên cứu chính thống) — củng cố thêm rằng hướng này khả thi với phần cứng phổ thông. | webgazer.cs.brown.edu; bài báo IJCAI 2016 (Papoutsaki et al.); video build-log "DIY Apple Vision Pro" (dùng eye tracker điều khiển con trỏ chuột qua webcam-mounted rig, ghi nhận độ trễ thấp). |
| **Dự đoán/giữ trạng thái khi mất dấu ngắn** (đã có "grace period" 180ms — nên nâng thành dự đoán vận tốc/gia tốc thay vì chỉ đóng băng vị trí cuối) | Giải quyết trực tiếp vấn đề #5. | Kỹ thuật chuẩn trong theo dõi chuyển động thời gian thực. |

### 5.2 Cần cân nhắc lại hoặc không phù hợp

| Hướng | Vì sao không phù hợp (hoặc cần hạ kỳ vọng) |
|---|---|
| **Optical Coherence Tomography (OCT)** | Kỹ thuật chụp ảnh y sinh, phân giải micromet, độ sâu chỉ 1-2mm (võng mạc, da) — sai thang đo hoàn toàn so với theo dõi cả bàn tay ở 30-80cm. |
| **Optical Sectioning** | Kỹ thuật kính hiển vi cho mẫu vật nhỏ dưới kính — cùng vấn đề thang đo như OCT. |
| **App điện thoại phát sóng xuyên tay rồi nhận lại** | Điện thoại thương mại không có phần cứng phát/thu sóng xuyên vật thể — đây là thiếu phần cứng, không phải thiếu phần mềm. |
| **Cảm biến qua tín hiệu WiFi (CSI)** | Có thật trong nghiên cứu nhưng cần quyền truy cập channel-state ở tầng driver/firmware, không có qua app/trình duyệt thường; độ phân giải cũng chỉ đủ nhận chuyển động thô, không đủ 21 điểm khớp. |
| **Photogrammetry / NeRF / 3D Gaussian Splatting** | Kỹ thuật tái tạo 3D thật và mạnh, nhưng thiết kế cho cảnh tĩnh chụp nhiều góc rồi xử lý — chưa thực tế cho một bàn tay chuyển động nhanh cần phản hồi tức thời trên phần cứng phổ thông. Ghi nhận là hướng nghiên cứu dài hạn. |
| **Nguyên lý gương phản chiếu để thấy góc khuất** | Đúng về vật lý, chi phí gần như 0 — đáng thử nghiệm phụ, nhưng ảnh phản chiếu nhỏ/méo làm giảm độ tin cậy phát hiện, và hiệu chỉnh vị trí gương để tam giác hóa 3D không đơn giản. Xếp vào "thử nghiệm phụ", không phải giải pháp chính. |
| **Depth sensing chuyên dụng (ZED, Kinect, RealSense)** | Đúng hướng, mạnh hơn cả Leap Motion (depth map toàn cảnh) — nhưng đắt, cần driver riêng, cồng kềnh hơn cho bài toán chỉ cần theo dõi 1 bàn tay ở cự ly gần. Leap Motion cân bằng chi phí/hiệu quả tốt hơn cho đúng bài toán này. |

## 6. Kiến trúc đề xuất (theo giai đoạn)

**Giai đoạn 1 — trong web hiện tại, không cần phần cứng mới:**
- `@mediapipe/hands` → `@mediapipe/tasks-vision` `HandLandmarker`.
- Nâng One-Euro Filter thành có dự đoán vận tốc; kéo dài "grace period" khi mất dấu.
- Sửa lỗi hysteresis chụm/nhả: chuẩn hóa `pinchDist`/`handSpan` theo landmark 3D thay vì tỉ lệ 2D đơn thuần (tránh co giãn sai khi tay nghiêng).
- Thêm gaze (WebGazer.js) cho việc chọn mục tiêu ở xa, giữ tay chụm cho việc vẽ/kéo chính xác.

**Giai đoạn 2 — nếu Giai đoạn 1 chưa đủ mượt:**
- Tách nhận diện tay ra tiến trình native (Python + OpenCV/MediaPipe Python, hoặc thử WiLoR), stream landmark qua WebSocket cục bộ — web chỉ nhận dữ liệu sạch đã lọc.

**Giai đoạn 3 — nếu sẵn sàng đầu tư phần cứng rẻ (~10-250 USD):**
- Bộ điều khiển gyro rẻ (Joy-Con/PS4-PS5 cũ) chuyên trách phần XOAY tay, MediaPipe chỉ lo phần NGÓN — giải quyết vấn đề #4 gần như ngay lập tức, chi phí thấp nhất trong mọi phương án phần cứng.
- Hoặc Leap Motion Controller (bản 1, ~30-50 USD) nếu muốn thay hẳn webcam bằng cảm biến IR chuyên dụng — giải quyết triệt để hơn cả #3 và #4.

## 6b. Phân vùng Frontend / Backend (áp dụng từ Giai đoạn 2 trở đi)

Chỉ cần thiết nếu triển khai Giai đoạn 2/3 (tách tracking ra native). Ở Giai đoạn 1, mọi thứ vẫn chạy gọn trong trình duyệt như hiện tại — không có backend.

### Frontend (trình duyệt) — giữ nguyên vai trò hiện có
- **Không chạy mô hình nhận diện tay nặng nữa** khi có backend — chỉ nhận landmark đã lọc, không tự suy luận lại.
- Trách nhiệm: vẽ con trỏ ảo/AR overlay, phát sự kiện chuột thật lên DOM (`hand-bridge.js`), UI (`handscope-shell.js`: shell, canvas demo, bảng Calibration), gửi lệnh hiệu chỉnh (sensitivity, ngưỡng chụm) ngược về backend khi người dùng chỉnh thanh trượt.
- Kết nối: WebSocket client tới `ws://localhost:<port>` (cổng cấu hình được qua biến, không hardcode). **Bắt buộc có chế độ dự phòng**: nếu không kết nối được backend trong vài giây, tự động rơi về chạy MediaPipe ngay trong trình duyệt như hiện tại — không được để mất khả năng chạy độc lập chỉ bằng file tĩnh.

### Backend (tiến trình native) — mới, tùy chọn
- Ngôn ngữ đề xuất: Python (OpenCV + MediaPipe Python SDK, hoặc mô hình mạnh hơn như WiLoR nếu nâng cấp) — hệ sinh thái thị giác máy tính tốt, dễ thử mô hình mới; có thể viết lại C++/Rust sau nếu cần thêm hiệu năng, không bắt buộc ngay.
- Trách nhiệm: đọc webcam trực tiếp qua OpenCV (không qua trình duyệt, tránh giới hạn WASM/sandbox), chạy mô hình nhận diện tay, lọc/dự đoán chuyển động (One-Euro hoặc Kalman), phân loại cử chỉ (chụm/nắm/mở) ở tần suất cao, đóng gói JSON, phát qua WebSocket server.
- Cấu trúc dữ liệu gửi đi mỗi khung hình (đề xuất, không phải chuẩn cố định — điều chỉnh khi thực làm):
  ```json
  {
    "timestamp": 1234567890,
    "handDetected": true,
    "landmarks": [{"x": 0.1, "y": 0.2, "z": -0.01}],
    "gesture": "pinch",
    "confidence": 0.92
  }
  ```
- Nhận lệnh ngược từ frontend để hiệu chỉnh sống, ví dụ: `{"type": "setSensitivity", "marginX": 0.16, "marginY": 0.1}`.
- Nếu làm Giai đoạn 3 (gyro ngoài): backend là nơi hợp nhất (sensor fusion) dữ liệu gyro controller với landmark camera trước khi gửi — frontend không cần biết dữ liệu xoay đến từ nguồn nào.

**Ranh giới bắt buộc giữ:** frontend không bao giờ tự suy luận cử chỉ song song với backend (tránh hai nguồn sự thật lệch nhau — chỉ hiển thị + phát sự kiện chuột). Backend không bao giờ đụng vào DOM/sự kiện chuột của trang web — chỉ gửi dữ liệu thô đã xử lý qua WebSocket.

## 7. Kỹ năng / công nghệ AI thực hiện cần có

- Thị giác máy tính thời gian thực (MediaPipe Tasks Vision hoặc tương đương).
- Lọc tín hiệu/dự đoán chuyển động (One-Euro Filter, Kalman cơ bản).
- Nếu làm Giai đoạn 2: Python/OpenCV hoặc C++, giao tiếp liên tiến trình qua WebSocket.
- Nếu làm Giai đoạn 3 (gyro ngoài): đọc dữ liệu controller qua Gamepad API (trình duyệt) hoặc driver native, hợp nhất (sensor fusion) với dữ liệu MediaPipe.
- Đọc hiểu `hand-bridge.js`/`handscope-shell.js` hiện có trước khi sửa — không viết lại từ đầu, giữ nguyên API công khai ở mục 4.

## 8. Nguồn tham khảo — đã kiểm chứng nội dung thật

**Giữ lại, có giá trị kỹ thuật thật:**
- MediaPipe Tasks Vision docs + npm `@mediapipe/tasks-vision`
- Ultraleap docs (docs.ultraleap.com) — Leap Motion Controller
- WebGazer.js (webgazer.cs.brown.edu) + bài báo IJCAI 2016
- arXiv 2603.11383 (so sánh WiLoR vs MediaPipe trong điều kiện che khuất)
- Tài liệu "Webcam + Phone Hand Tracking in SteamVR with ALVR" — hướng dẫn tự làm thật, có bảng thiết bị/vai trò rõ ràng, đáng tin cậy ở mức "kỹ thuật viên tự làm" (không phải nghiên cứu học thuật)
- Video build-log "DIY Apple Vision Pro" — bằng chứng thực nghiệm cho việc gaze-controls-cursor khả thi với webcam phổ thông, nhưng chỉ ở mức proof-of-concept cá nhân, không phải benchmark chính thống

**Đã kiểm tra lại và loại khỏi căn cứ kỹ thuật:**
- `https://youtu.be/Zt8_d-v-T0w` — trước đây được đánh dấu "quan trọng nhất". Đã xem nội dung thật: đây là video thí nghiệm **nóng chảy/đông đặc nến** (chuyển thể lỏng-rắn bằng đèn cồn), **không liên quan gì đến kỹ thuật hand tracking**. Nhiều khả năng bị dán nhầm link, hoặc ban đầu định dùng làm tham khảo cảm giác "thí nghiệm thật" cho UX (không phải công nghệ theo dõi tay) — nếu ý đó đúng thì nên ghi rõ mục đích khi dùng lại, không xếp chung với các nguồn kỹ thuật.
- `https://youtu.be/HI2qsrIuR0E`, `https://youtu.be/QW1S7dlnWO0` — chưa truy xuất được nội dung dạng văn bản trong cả 2 lần kiểm tra. Không dùng làm căn cứ kỹ thuật cho tới khi có ai xem và tóm tắt lại nội dung thật.
- `microsoft/HoloLens2ForCV`, tài liệu HoloLens Research Mode, tài liệu hand-tracking Vision Pro của Apple — tài liệu thật của các hãng lớn, giá trị tham khảo khái niệm (đa cảm biến, kết hợp mắt+tay), nhưng không đọc được nội dung chi tiết (trang yêu cầu JavaScript / không truy cập trực tiếp được). Cần tự truy cập và xác minh nếu muốn trích dẫn cụ thể.

## 9. Tiêu chí hoàn thành

- Vấn đề #4 (nghiêng tay là hỏng hết) không còn xảy ra ở mức nghiêng thông thường khi thao tác.
- FPS ổn định ≥ 24 trong điều kiện ánh sáng phòng bình thường.
- Chụm/nhả không còn "đã mở tay nhưng hệ thống vẫn tưởng chụm" quá 1 khung hình.
- `hand-bridge.js` vẫn tổng quát, không gắn cứng vào bất kỳ ứng dụng cụ thể nào — kiểm tra bằng cách thử `window.HANDSCOPE_TARGET_SELECTOR` trỏ tới một canvas bất kỳ và xác nhận vẫn hoạt động.
