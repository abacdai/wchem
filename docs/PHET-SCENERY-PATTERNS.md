# PHET SCENERY — PATTERN GUIDE (DOM-ONLY SCENE GRAPH)

# ============================================================================
# NGUỒN & MỤC ĐÍCH
# ============================================================================

- Nguồn: nghiên cứu mã nguồn PhET Scenery tại
  `/tmp/opencode/scenery/` (Node.ts 6425 dòng, Input.ts 1952,
  PressListener.ts 1094, DragListener.ts 854, Picker.ts 744,
  DOM.ts, examples/input.html). RESEARCH ONLY — không import scenery.
- Mục đích: làm "scene graph nhẹ" bằng DOM thuần + sự kiện chuột thật từ
  hand-bridge (Lớp 1, task T-045 → `js/lab-scene.js`).
- Đây là kiến thức chắt lọc: chỉ giữ những pattern chuyển được sang DOM.

# ============================================================================
# A. SCENE GRAPH CƠ BẢN (node/cha-con, transform, hit-test)
# ============================================================================

1. Cây = 2 mảng trên mỗi node: `_children` (có thứ tự — **phần tử cuối vẽ
   trên cùng**) và `_parents` (không thứ tự). `parent.addChild(child)` thêm
   vào cuối; chainable (Node.ts:947). Bản DOM của ta: cây nghiêm ngặt
   (không cần DAG "nhiều cha" như scenery).
2. Transform: mỗi node 1 ma trận affine (tịnh tiến/scale/rotate). `x`/`y`
   chỉ là phần tử ma trận `m02`/`m12` (Node.ts:2553-2610). **Local→global**:
   đi lên `_parents`, nhân ma trận (Node.ts:5924-5936). **Global→local**:
   thu thập chuỗi, đi từ root xuống áp dụng nghịch đảo (Node.ts:5959-5980).
   DOM: `transform: translate(x,y) scale(s)` trên div; x/y/scale là **dữ
   liệu JS**, CSS chỉ là projection — không bao giờ đọc ngược từ CSS.
3. Bounds cache, lazy dirty: `selfBounds` (nội dung node, frame local),
   `localBounds` (cả cây con), `bounds` (frame cha), mỗi loại 1 cờ dirty,
   chỉ tính khi cần (Node.ts:529-588). Hit-test chạy nhanh nhờ bounds cache.
4. Picking / hit-test (`Picker.recursiveHitTest`, Picker.ts:136-218), thứ
   tự bắt buộc:
   a. Loại ngay nếu invisible hoặc `pickable === false` (Picker.ts:141).
   b. Loại nhanh: điểm ngoài cached `bounds` → null (Picker.ts:163).
   c. Biến điểm về frame local bằng ma trận nghịch đảo (Picker.ts:169).
   d. **Duyệt con NGƯỢC (trên cùng trước)**, trả hit đầu tiên
      (Picker.ts:182-193).
   e. Chỉ khi mọi con trượt mới test self: `selfBounds.containsPoint(local)`
      rồi `containsPointSelf(local)` — override theo hình dạng từng node,
      mặc định = selfBounds (Node.ts:2138-2141).
   f. Kết quả là **Trail** (danh sách có thứ tự root→leaf, Node.ts:138-167)
      — chính trail này để sự kiện bubble lên các tổ tiên.
5. Listener: `node.addInputListener(listener)` đẩy vào `_inputListeners`
   (Node.ts:2312-2334); `removeInputListener` gỡ (Node.ts:2339-2360).

# ============================================================================
# B. VÒNG ĐỜI LISTENER (press → drag → release)
# ============================================================================

Tên chính thức hiện tại: phương thức `press/release/interrupt` + callback
`start/drag/end` (không còn `startDrag/drag/endDrag` — tên cũ, đã thay):

1. `canPress(event)` — cổng bảo vệ: `enabled && !isPressed &&
   đúng nút chuột && !pointer.isAttached()` (PressListener.ts:450-459).
   `press()` trả `false` nếu thất bại (PressListener.ts:492-495).
2. `press(event)` → `onPress` (PressListener.ts:730-752): lưu `pointer`,
   tính `pressedTrail`, **đính listener vào pointer**
   (`pointer.addInputListener(...)`), set `isPressed = true`, rồi gọi
   callback `press` của người dùng. DragListener bổ sung:
   `pointer.reserveForDrag()`, ghi điểm local lúc nhấn, rồi gọi `start`
   (DragListener.ts:300-349).
3. `pointerMove` (khi đang pressed) → `drag(event)` → callback `drag`
   (PressListener.ts:910-926). Cổng: `if (!this.isPressed) return`
   (event cũ bị queue lại), bỏ move có delta = 0 (DragListener.ts:427).
4. `pointerUp` → `release(event)` → `onRelease` (PressListener.ts:760-781):
   **gỡ khỏi pointer**, `isPressed = false`, gọi callback `release` rồi
   DragListener gọi `end` (DragListener.ts:360-374).
5. `pointerCancel` / `interrupt()` → release với cờ `interrupted = true`
   để phân biệt hủy vs. kết thúc tự nhiên (PressListener.ts:889-903, 561-604).

State drag handler PHẢI giữ: `pointer` (ai sở hữu drag), `pressedTrail`,
`isPressed`, `interrupted`, và mỗi drag: `_globalPoint` (hiện tại),
`_localPoint` (điểm bấm trong frame local của node = "grab offset"),
`_parentPoint`, `_modelPoint`, `_modelDelta` (DragListener.ts:169-186).

# ============================================================================
# C. ĐIỀU HƯỚNG SỰ KIỆN (pointer → target → bubble)
# ============================================================================

1. DOM event → Input chuẩn hóa thành `down/move/up/cancel` theo từng
   pointer (Input.ts:1618-1703).
2. Tìm target: `rootNode.trailUnderPointer(pointer)` = `hitTest(pointer
   .point)` (Input.ts:1611-1613; Node.ts:2118-2120). Trail tính mới mỗi
   event, cache trên pointer.
3. Thứ tự dispatch (Input.ts:1816-1855):
   a. **Listener đã đính trên pointer trước** — đây là cơ chế để drag đang
      chạy vẫn nhận move dù pointer đã rời khỏi node (đính lúc press,
      PressListener.ts:741).
   b. **Bubble theo trail: leaf → root** (`dispatchToTargets`,
      Input.ts:1906-1935): với mỗi node, `event.currentTarget = node`,
      gọi listener của node đó; **dừng nếu `event.handled`** (như
      stopPropagation).
   c. Listener cấp display sau cùng.
4. `enter`/`exit` KHÔNG bubble; `over`/`out`/`move`/`down`/`up` bubble
   (Input.ts:1768-1801). Event mang cờ `handled`/`aborted`
   (SceneryEvent.ts:30-33, 94-105).

Thứ tự cháy khi bấm vào lá D: listener của D → C → A (root cuối cùng).

# ============================================================================
# D. SỐ HỌC KÉO-THẢ CỤ THỂ (bắt buộc áp dụng)
# ============================================================================

`reposition(globalPoint)` (DragListener.ts:651-684):

```
translation = globalToParent(điểm hiện tại)   // pointer về frame cha của node
            − localToParent(localPointLúcBấm) // grab offset: điểm đã bấm trên node
            + localToParent(0,0)              // bù gốc tọa độ node
```

- Lúc **press**: ghi `localPointLúcBấm` = global→parent→local của điểm
  nhấn (DragListener.ts:327-336). Node "bị bắt tại điểm đó", không nhảy
  tâm ra chỗ con trỏ (`applyParentOffset`, DragListener.ts:626-643).
- Lúc **move**: `parentPoint = globalToParent(pointer)` → trừ grab offset
  → **clamp**: `mapModelPoint` = `dragBounds.closestPointTo(modelPoint)`
  (DragListener.ts:610-621) — clamp trong model space TRƯỚC khi ghi, rồi
  quy ngược giá trị đã clamp về parent và ghi (DragListener.ts:667-673).
  Delta = modelPoint mới − modelPoint cũ (`_modelDelta`).
- Áp dụng: `node.translation = parentPoint` (nếu `translateNode: true`)
  hoặc ghi `positionProperty.value` (DragListener.ts:675-681). Ví dụ:
  `new DragListener({ translateNode: true })` (examples/input.html:155),
  có giới hạn: `{ translateNode: true, dragBoundsProperty }`
  (input.html:241-244), theo model: `{ positionProperty, transform }`
  (input.html:278).
- Clamp TRƯỚC khi áp dụng, không bao giờ sau; bỏ move delta = 0.

# ============================================================================
# E. 10 LUẬT THIẾT KẾ CHUYỂN SANG DOM-ONLY
# ============================================================================

1. **Model, không phải CSS**: x/y/scale/rotation là dữ liệu JS; DOM/CSS
   chỉ là projection của model. Đọc `x` từ dữ liệu, không từ
   getBoundingClientRect() (Node.ts:2553-2610).
2. **Hit-test trên cùng trước**: duyệt con ngược z-order, lấy hit đầu
   tiên; test self chỉ sau khi mọi con trượt (Picker.ts:182-193). Nếu dùng
   `elementFromPoint` native thì được miễn, nhưng khi tự route pointer cho
   hand-bridge phải giữ thứ tự này.
3. **Một pointer một drag**: press đính listener vào pointer
   (PressListener.ts:741) nên drag được cấp trực tiếp dù pointer rời node;
   cổng `canPress: !pointer.isAttached()` (PressListener.ts:458). Không
   bao giờ bắt đầu drag thứ 2 trên pointer đã đính.
4. **Bubble leaf→root**: dispatch tới listener của target rồi từng tổ
   tiên; listener có thể `handle()` để chặn bubble (Input.ts:1906-1935).
   Nhờ vậy bình nhận event ngay khi chạm vào con của nó (miệng ống...).
5. **Ghi grab offset lúc press**: lưu vị trí pointer trong frame local của
   node 1 lần; position = pointer − offset (DragListener.ts:626-643) —
   node được "bắt", không nhảy về tâm con trỏ.
6. **Clamp trong model space, view suy ra sau**: áp giới hạn drag lên
   model point rồi mới tính lại translation từ giá trị đã clamp
   (DragListener.ts:610-621, 667-673) — clamp ở view làm node rời khỏi
   con trỏ.
7. **Bounds cache + dirty flag**: bounds (self/subtree) cache sẵn; hit-test
   chống lại bounds rẻ tiền trước, `containsPointSelf` tốn kém sau
   (Picker.ts:163, 209; Node.ts:570-588).
8. **Interrupt, không rò rỉ**: mọi press phải có đường release đối xứng
   qua `interrupt()` (cancel, node ẩn, listener bị tắt, pointer bị cướp) —
   set cờ `interrupted` để handler phân biệt hủy/release
   (PressListener.ts:561-604, 889-903). Với hand-bridge: sự kiện "mất tay"
   tổng hợp PHẢI map vào `interrupt()`.
9. **Chọn rõ ràng**: hỗ trợ `pickable: false` và invisible = không pickable
   — để container dụng cụ không nuốt hit đáng lẽ thuộc con
   (Picker.ts:141; Trail.ts:161-164).
10. **Pointer như abstraction**: bọc down/move/up tổng hợp của hand-bridge
    trong đối tượng `Pointer` tối giản `{ id, point, isDown, listeners }`
    để listener không bao giờ chạm DOM event thô (SceneryEvent.ts:28-89) —
    chuột thật và điều khiển tay dùng chung một đường.

# ============================================================================
# GHI CHÚ IMPLEMENTATION CHO T-045 (lab-scene.js)
# ============================================================================

- Mỗi LabNode = 1 div `position:absolute; left:0; top:0` chứa nội dung;
  transform qua CSS (mẫu: DOM.ts:69-105); bounds = offsetWidth/Height.
- Z-order = thứ tự trong mảng children (DOM native); kéo lên trên cùng khi
  bắt đầu drag (đổi z-index) — như `moveChildToIndex` (Node.ts:1041).
- `hitTest(x,y)`: duyệt ngược cây, bounds cached, biến đổi điểm ngược qua
  transform cha-con; trả trail root→leaf.
- Press/drag/release: tái tạo đúng thứ tự mục B; grab offset mục D;
  interrupt khi pointer mất.
