# CHEM LAB — ROADMAP DÀI HẠN (QUEST)

# ============================================================================
# TẦM NHÌN
# ============================================================================

Biến `lab.html` (hiện là HandScope demo vẽ màu) thành một **Phòng thí nghiệm
Hóa học ảo** hoạt động như https://chemistry-en.nobook.com/ (NB化学实验) —
kéo thả dụng cụ, trộn hóa chất, quan sát phản ứng — nhưng **tương tác bằng
tay qua webcam** (pinch = kéo thả chuột trái, fist = chuột phải) nhờ
`hand-bridge.js` đã có sẵn (phát sự kiện chuột THẬT lên DOM).

Kiến trúc tham khảo: **PhET Scenery** (https://github.com/phetsims/scenery)
— scene graph: node = 1 vật thể (dụng cụ/hóa chất), pointer events, drag
listener, hit-testing, transform (vị trí/zoom). Ta triển khai một "scene
graph nhẹ" bằng DOM + sự kiện chuột thật từ hand-bridge, KHÔNG import
scenery (tránh dependency mới; theo luật lệ project).

# ============================================================================
# KIẾN TRÚC 3 LỚP
# ============================================================================

  [Lớp 1: Giao diện & Drag-Drop]  ---  bench, tủ dụng cụ, kéo-thả bằng
                                        pinch (chuột trái), snap, phóng to
  [Lớp 2: Va chạm & Ghép nối]     ---  miệng ống → miệng bình, đổ chất lỏng,
                                        ghép nhiệt kế/bếp đun, phát hiện
                                        chồng/chạm (AABB + khoan dung)
  [Lớp 3: Logic Hóa học & Animation] --- phản ứng hóa học (tái dùng
                                        lib/reactions.ts), đổi màu, sủi bọt,
                                        tỏa khí, kết tủa, animation pour

# ============================================================================
# LỚP 1: GIAO DIỆN & DRAG-DROP  (Tasks T-044 → T-048)
# ============================================================================

Mục tiêu: bench hóa học nhìn như nobook, mọi dụng cụ kéo thả được bằng
pinch tay (và chuột/touch thường), không vẽ màu.

Nhiệm vụ:

1. **T-044 (đang chạy): Dọn demo vẽ màu** — xóa palette/craft menu, nút
   "Xóa canvas", toàn bộ logic vẽ (lab.js PALETTE, setBrush, dotAt, lineTo,
   pointers). GIỮ: hand tracking, gaze, calibration sliders, console, tabs,
   #lab-canvas (vẫn là target của hand-bridge).
2. **T-045: Khung bench + scene graph nhẹ** — `js/lab-scene.js` mới:
   `LabScene` quản lý danh sách `LabNode` (id, type, x, y, w, h, element);
   hit-test theo tọa độ; mỗi node kéo thả bằng pointerdown/move/up
   (chuột thật từ hand-bridge); z-index theo thứ tự kéo.
3. **T-046: Tủ dụng cụ (cabinet)** — thanh trượt bên trái/top chứa các
   dụng cụ mẫu (cốc beaker, bình tam giác flask, ống nghiệm test tube,
   phễu funnel, đũa thủy tinh, bếp đun burner). Click/spawn bằng pinch,
   kéo ra bench.
4. **T-047: Kệ hóa chất** — hóa chất phổ thông (H2O, HCl, NaOH, CuSO4,
   NaHCO3, CH3COOH, phenolphtalein…) dạng "lọ" kéo được; màu dung dịch
   đúng thực tế; mỗi lọ có tooltip tên + công thức.
5. **T-048: Snap + scale + reset** — dụng cụ chạm gần → snap về vị trí
   chuẩn; kéo ra xa → rời; nút reset bench; giữ bố cục responsive.

Tiêu chí hoàn thành Lớp 1:

- Kéo-thả bằng pinch tay đưa dụng cụ từ cabinet ra bench và di chuyển.
- Gaze/calibration/console/start-stop camera không đổi hành vi.
- Harness 13/13 + test mới cho LabScene (spawn, hit-test, drag).
- Không vẽ màu, không palette, không nút Xóa canvas.

# ============================================================================
# LỚP 2: XỬ LÝ VA CHẠM & GHÉP NỐI  (Tasks T-049 → T-053)
# ============================================================================

Mục tiêu: các dụng cụ ghép nối/thao tác với nhau đúng ngữ nghĩa hóa học.

Nhiệm vụ:

1. **T-049: Va chạm AABB** — mô-đun `lab-collide.js`: phát hiện chạm giữa
   2 node (khoan dung + sai số để thao tác tay không quá khó), highlight
   node khả ghép (viền sáng) khi kéo lơ lửng phía trên.
2. **T-050: Ghép nối ống → bình** — kéo ống nghiệm tới miệng bình
   (flask/beaker) → "đổ vào" (state: bình nhận chất lỏng từ ống); bình
   lấp đầy theo lượng; kéo bình tới bình → đổ chéo.
3. **T-051: Ghép nhiệt** — kéo bình lên bếp đun → trạng thái `heating`
   (bếp bật ngọn lửa animation đơn giản); kéo ra → tắt.
4. **T-052: Ghép dụng cụ phụ** — đũa khuấy vào bình (khuấy tăng tốc hòa
   tan), phễu lên miệng bình (lọc), nắp đậy (cô lập khí).
5. **T-053: Phản hồi va chạm** — rung/highlight khi ghép sai, âm thanh
   (tùy chọn), log console "Đã đổ 10ml HCl vào bình".

Tiêu chí hoàn thành Lớp 2:

- Đổ chất lỏng ống→bình, bình→bình bằng pinch (độ chính xác thao tác
  tay thực tế, khoan dung rộng).
- Bình trên bếp đun có animation lửa; khuấy/lọc/đậy hoạt động.
- Test đơn vị cho lab-collide (chạm/không chạm, snap ngưỡng).

# ============================================================================
# LỚP 3: LOGIC HÓA HỌC & ANIMATION  (Tasks T-054 → T-058)
# ============================================================================

Mục tiêu: phản ứng hóa học thật, hoàn toàn phía client, không cần server.

Nhiệm vụ:

1. **T-054: Engine phản ứng** — tái sử dụng dữ liệu từ
   `taskflow/frontend/src/lib/reactions.ts` (neutralization, acid-carbonate,
   combustion, oxidation, electrolysis) hoặc bản JS thuần mới
   `js/lab-chem.js`: map tác chất → sản phẩm, cân bằng, điều kiện
   (nhiệt độ/đun nóng/xúc tác).
2. **T-055: Trạng thái dung dịch** — mỗi bình quản lý danh sách chất
   + thể tích + màu; trộn 2 chất → màu mới theo sản phẩm (vd: CuSO4 +
   NaOH → kết tủa xanh Cu(OH)2; phenolphtalein + kiềm → hồng).
3. **T-056: Animation phản ứng** — sủi bọt (bubble particles), tỏa khí
   (bong bóng bay lên + hứng khí), kết tủa (đục dần), đổi màu (lerp màu),
   nhiệt độ (màu ngọn lửa). Dùng rAF, không thư viện nặng.
4. **T-057: Quan sát & hướng dẫn** — bảng "Quan sát" (như nobook): hiện
   phương trình cân bằng, trạng thái, màu sắc, kết luận; console log
   từng bước; nút "Làm lại".
5. **T-058: Thử thách (tùy chọn)** — chuỗi thí nghiệm có đích (vd: điều
   chế CO2, nhận biết axit-bazơ); điểm số + lưu kết quả qua
   chemlab-client (compound library đã có sẵn).

Tiêu chí hoàn thành Lớp 3:

- Ít nhất 6 phản ứng tiêu biểu chạy đúng (đổi màu/bọt/kết tủa/khí).
- Phương trình cân bằng + quan sát hiển thị đúng.
- Tương tác toàn bộ bằng tay qua webcam không cần chuột.

# ============================================================================
# LỘ TRÌNH THEO GIAI ĐOẠN
# ============================================================================

| Giai đoạn | Tasks          | Nội dung                          | Kết quả |
|-----------|----------------|-----------------------------------|---------|
| G1        | T-044          | Dọn demo vẽ màu                   | lab.html sạch vẽ, mọi thứ khác còn |
| G2        | T-045 → T-048  | Lớp 1: UI & Drag-Drop             | bench + kéo thả bằng tay |
| G3        | T-049 → T-053  | Lớp 2: Va chạm & Ghép nối         | đổ/đun/khuấy/lọc |
| G4        | T-054 → T-058  | Lớp 3: Logic Hóa & Animation      | phản ứng + animation |
| G5        | polish         | UI/UX pro-max, reduced-motion,    | sản phẩm hoàn chỉnh |
|           |                | audio, hiệu năng, docs            | |

Luật mỗi vòng lặp (bắt buộc theo LOOP.md):

- Tối đa 3 file, 300 dòng, 1 feature, 1 bug mỗi iteration.
- Mỗi task phải: build → test → cập nhật STATE.md + loop-run-log.md.
- Không import thư viện mới (scene graph tự viết, nhẹ).
- Không phá hand-bridge.js (lõi tracking) — chỉ dùng sự kiện chuột nó phát ra.
- Không phá gaze/calibration/console/start-stop camera.
- Số liệu: harness 13/13 luôn xanh; test mới cho từng module mới.

# ============================================================================
# RỦI RO & GIẢM THIỂU
# ============================================================================

1. **Chính xác pinch kéo thả** — hand tracking có nhiễu → dùng khoan dung
   va chạm rộng (≥24px), snap khi release gần đích, One-Euro filter đã có.
2. **FPS** — animation dùng rAF, giới hạn particle pool, tránh reflow:
   transform/opacity thay vì layout.
3. **Phản ứng không đúng thực tế** — giữ database phản ứng đã kiểm chứng
   (tái dùng lib/reactions.ts), hiển thị "Mô phỏng — không thực hiện thật".
4. **Thao tác tay khó với đối tượng nhỏ** — vùng chạm tối thiểu 44px,
   bench scroll/zoom nếu cần (Lớp 1 có scale).

# ============================================================================
# FILE DỰ KIẾN
# ============================================================================

- lab.html — cấu trúc bench (sửa)
- js/lab.js — chỉ giữ tracking/gaze/console/tabs (sửa, xóa vẽ)
- js/lab-scene.js — scene graph + drag (mới)
- js/lab-collide.js — AABB + snap (mới)
- js/lab-chem.js — phản ứng + animation (mới)
- css/lab.css — bench + dụng cụ styles (sửa)
- tests/ — lab-scene.spec.js, lab-collide.spec.js, lab-chem.spec.js (mới)
- docs/CHEM-LAB-ROADMAP.md — quest này (mới)
