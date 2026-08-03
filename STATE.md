# STATE.md

# ============================================================================
# PROJECT INFORMATION
# ============================================================================

Project Name: Wchem
Project Type: Full-Stack Web Application (Hand-Tracked AR Chemistry Lab)
Framework: Loop Engineering
AI Runtime: OpenCode
Current Branch: main

Status:
🟢 Active Development

Last Updated:
2026-08-03 16:40:00 +07:00

Current Cadence:
Minimal Loop

Current Phase:
DONE

Iteration:
75

# ============================================================================
# MASTER GOAL
# ============================================================================

Build and continuously improve the Wchem platform while maintaining stability.

The AI MUST continue from the current task instead of restarting the project.

The AI MUST preserve all working features.

The AI MUST perform only minimal safe modifications.

# ============================================================================
# CURRENT TASK
# ============================================================================

Task ID:
T-065

Task Title:
Chống vọt ngoại suy (overshoot) khi tay di chuyển/đổi hướng

Objective:
User: "kiểu gia tốc nó hơi quá, khi mà di chuyển các ngón tay rồi bàn tay thì
nó hơi quá" — con trỏ chạy vọt theo quán tính do ngoại suy vận tốc quá mạnh.
Root cause: EXTRAPOLATE_FACTOR 0.6 + cửa sổ 100ms không có phanh khi tay
đảo hướng/giảm tốc → khi thả tay/dừng, con trỏ vẫn lao tiếp vài frame. Fix:
(1) hạ mức ngoại suy — MAX_EXTRAPOLATE_MS 100 → 60, EXTRAPOLATE_FACTOR 0.6 →
0.3 (lead còn ~8-18ms, vẫn giữ lợi ích giảm trễ); (2) phanh quán tính trong
extrapolateLandmarks — so vận tốc hiện tại (cổ tay lm0) với lần ngoại suy
trước (bank.__velPrev): đảo hướng (dot < 0) → factor ×0.2; giảm tốc quá 50%
→ factor ×0.45. Giữ nguyên latency, pipeline, cử chỉ.

Expected Result:
Tay di chuyển nhanh rồi dừng/đổi hướng → con trỏ dừng theo, không lao vọt;
tay chậm vẫn bám sát (không tụt hậu như trước T-063).

Success Criteria:

- Ngoại suy vẫn hoạt động: test cap cập nhật 0.06 (60ms); z giữ nguyên.
- Phanh đảo hướng: vận tốc đảo dấu → mức ngoại suy ×0.2 (test mới).
- Phanh giảm tốc: vận tốc giảm >50% → mức ngoại suy ×0.45 (test mới).
- Harness 90/90 (88 cũ + 2 mới); node --check + git diff --check sạch;
  STATE/log cập nhật.

Dependencies:
T-064 (latency reduction) — DONE

Priority:
High

Task ID:
T-064

Task Title:
Giảm độ trễ hand tracking (filter lag + lead bù inference)

Objective:
User: "handtracking ít bị delay". Root cause: (1) One-Euro SMOOTH_MINCUTOFF
0.6 → lag ~200-250ms ở tay chậm (alpha ~0.11/frame); (2) kết quả inference
phản ánh video cách "bây giờ" ~một lần inference (~28ms) nhưng processFrame
dùng nguyên landmark cũ. Fix: tăng độ phản hồi filter (SMOOTH_MINCUTOFF 1.4,
SMOOTH_BETA 0.35, SMOOTH_DCUTOFF 1.6 → lag ~100ms, nhiễu chấp nhận được);
bù lead ngay khi kết quả MỚI đến — processFrame(extrapolateResults(
modelResults, inferenceLatency)) với inferenceLatency đo thực tế quanh
detectForVideo; nới cửa sổ ngoại suy (MAX_EXTRAPOLATE_MS 100, factor 0.6).

Expected Result:
Con trỏ bám tay rõ rệt hơn khi tay di chuyển chậm (lag filter giảm ~60%);
kết quả inference mới được bù tới vị trí tay hiện tại thay vì cách đây vài
chục ms; vẫn lọc nhiễu — không thay pipeline MediaPipe, không đổi camera.

Success Criteria:

- Filter: sau 2 mẫu đạt >40% bước nhảy (test mới 88/88); test jitter cũ
  vẫn xanh (filter vẫn làm trơn).
- Fresh path: processFrame nhận kết quả ngoại suy theo inferenceLatency đo
  thực tế quanh await detectForVideo (biến loop mới, khởi tạo 0).
- Harness 88/88 (87 cũ + 1 mới, expectation cap ngoại suy cập nhật 80→100ms);
  node --check + git diff --check sạch; STATE/log cập nhật.

Dependencies:
T-063 (latency extrapolation) — DONE

Priority:
High

Task ID:
T-063

Task Title:
Nâng cấp hand tracking realtime (latency + FPS + 2-hand stability)

Objective:
User requested an upgrade of the realtime hand tracking, integrating three
directions: (1) giảm độ trễ cảm nhận bằng ngoại suy vận tốc One-Euro giữa
các frame inference; (2) tăng FPS bằng inference thích ứng theo chuyển động
tay; (3) ổn định tay chính khi có 2 tay (primary sticky) — không giật khi
hai tay giao thoa. Camera resolution đã ở mức tối thiểu (320x240) nên không
giảm thêm (giữ độ chính xác). Không thay pipeline MediaPipe.

Expected Result:
Con trỏ tay bám ngay, không tụt hậu trên tick bỏ qua; tay chậm → inference
giảm 2/3 frame (FPS cao hơn), tay nhanh → full rate; tay chính không nhảy
sang tay khác khi cả 2 cùng hiện diện.

Success Criteria:

- Ngoại suy: landmark di chuyển theo dxPrev One-Euro, cửa sổ giới hạn 80ms,
  factor 0.5; z giữ nguyên.
- Inference thích ứng: computeSkipEvery(0.001)=3, (0.1)=1, ngưỡng 0.02.
- Primary sticky: R dẫn trước khi 2 tay; L đứng trước trong mảng không cướp
  quyền; chuyển tay chính chỉ khi tay cũ biến mất.
- Harness 87/87 (84 cũ + 3 mới); cử chỉ menu T-062 không hồi quy;
  node --check + git diff --check sạch; STATE/log cập nhật.

Dependencies:
T-062 (menu nổi ẩn) — DONE

Priority:
High

Task ID:
T-062

Task Title:
Menu nổi ẩn chất + dụng cụ (hidden floating menu, gesture pinch-all → spread)

Objective:
Gom toàn bộ hóa chất (kệ shelf) và dụng cụ (tủ cabinet) vào một menu nổi
ẩn giữa bench thay vì hai strip cố định hai bên. Cử chỉ "chụm hết các đầu
ngón tay rồi bung mở ra" bật/tắt menu: chụm 4 ngón (thumb+index+middle+
ring+pinky) rồi bung bàn tay mở → menu hiện giữa bàn thí nghiệm với đầy đủ
chất và dụng cụ; làm lại cử chỉ → menu ẩn.

Expected Result:
lab.html không còn 2 strip cố định; cabinet (7 dụng cụ) và shelf (9 hóa
chất) hiển thị dưới dạng 2 panel nổi giữa bench khi cử chỉ được thực hiện,
ẩn hoàn toàn khi không mở; kéo chip vẫn spawn bản sao như trước.

Success Criteria:

- Cabinet + shelf ẩn mặc định (display none, aria-expanded=false).
- Cử chỉ chụm 4 ngón → bung mở phát `handscope:tool-menu-toggle` (đúng 1
  lần); chụm trỏ thường + mở KHÔNG kích hoạt.
- Menu mở: 2 panel nổi căn giữa bench (7 chip dụng cụ + 9 chip hóa chất),
  aria-label cập nhật; menu đóng khi lặp lại cử chỉ.
- 0 console errors; harness 84/84; STATE/log cập nhật; state lưu agentmemory.

Dependencies:
T-061 (AR terminology sweep) — DONE

Priority:
High

Task ID:
T-061

Task Title:
Remaining AR terminology sweep

Objective:
Finish the remaining high-impact AR terminology alignment after the homepage pass.

Expected Result:
Profile page and core project docs consistently describe Wchem as a hand-tracked AR chemistry lab.

Success Criteria:

- Profile page metadata/title/navbar use WChem AR terminology.
- project-context.md describes Wchem as a hand-tracked AR chemistry lab.
- STRUCTURE.md labels the lab page/styles/scripts as AR Lab assets.
- Existing hand tracking, bench, reaction, observer, challenge, and accessibility flows remain stable.
- Source checks and root tests stay green; STATE/log updated.

Dependencies:
T-060 AR product terminology alignment — DONE

Priority:
High

Task ID:
T-051

Task Title:
Layer 2: Ghép nhiệt (heating coupling)

Objective:
Per docs/CHEM-LAB-ROADMAP.md Lớp 2 item 3: drag a vessel onto the burner
(bếp đun) → heating state (burner shows a simple flame animation); drag
away → off. Builds on the T-049 collision tracker.

Expected Result:
Vessel over burner → flame + heating state; vessel off the burner →
flame off; no regression.

Success Criteria:

- Coupling state (heating source/target) tracked; flame toggles on/off.
- Harness 13/13 + new tests green; STATE/log updated.

Dependencies:
T-050 (pour coupling) — DONE

Priority:
High

Task ID:
T-050

Task Title:
Layer 2: Ghép nối ống → bình (pour coupling)

Objective:
Per docs/CHEM-LAB-ROADMAP.md Lớp 2 item 2: drag a test tube to the mouth
of a flask/beaker → "pour" (state: the vessel receives liquid from the
tube); the vessel fills by amount; drag a vessel onto another vessel →
cross-pour. Builds on the T-049 collision tracker.

Expected Result:
Tube over vessel mouth → liquid transfers visually; vessel fill level
tracks the amount; vessel-to-vessel pouring works; no regression.

Success Criteria:

- Coupling states (pouring source/target, fill amount) tracked per node.
- Fill visualization updates on the target; source empties.
- Harness 13/13 + new tests green; STATE/log updated.

Dependencies:
T-049 (AABB collision + highlight) — DONE

Priority:
High

Task ID:
T-049

Task Title:
Layer 2: Va chạm AABB (lab-collide.js) — collision + highlight

Objective:
Per docs/CHEM-LAB-ROADMAP.md Lớp 2 item 1: new js/lab-collide.js —
detect touch between two LabNodes (AABB with tolerance so hand
operations are not too hard), highlight the matchable node (bright
border) while a drag hovers above it. Layer 2 opens with this module.

Expected Result:
Dragging one item over another highlights the hovered node when their
boxes are within tolerance; no false triggers from strips/UI.

Success Criteria:

- AABB overlap test with configurable tolerance on top of the scene.
- Hover highlight via dragging-class style; clears on drop/move-away.
- Harness 13/13 + new collide tests green; no regression.
- STATE/log updated.

Dependencies:
T-048 (snap/scale/reset, Layer 1 complete) — DONE

Priority:
High

Task ID:
T-048

Task Title:
Layer 1: Snap + scale + reset bench (Layer 1 complete)

Objective:
Per docs/CHEM-LAB-ROADMAP.md Lớp 1 item 5: glassware dragged near a
reference spot snaps to the standard position; pulling away releases it;
a reset-bench button restores the initial layout; layout stays responsive.
Closes Layer 1 (G2).

Expected Result:
Items snap when dropped close to a snap target, drag away freely otherwise;
reset button returns seeds/copies to the initial arrangement; no regression.

Success Criteria:

- Snap: drop within threshold → item locks to the standard position.
- Release: dragging away from the snap target detaches the item.
- Reset button restores the bench layout; responsive layout intact.
- Harness 13/13 + lab-scene tests green; STATE/log updated.

Dependencies:
T-047 (chemical shelf) — DONE

Priority:
High

Task ID:
T-047

Task Title:
Layer 1: Kệ hóa chất (chemical shelf) — draggable reagent bottles

Objective:
Implement the chemical shelf (docs/CHEM-LAB-ROADMAP.md Lớp 1 item 4): a
strip (sibling of the cabinet or a second row) listing common reagents as
draggable bottles — H2O, HCl, NaOH, CuSO4, NaHCO3, CH3COOH,
phenolphtalein — each with its real solution color and a tooltip showing
name + formula. Same spawn-and-grab takeover pattern as T-046; bottles
render with the correct liquid color so Layer 2/3 can read it later.

Expected Result:
Users pinch a reagent chip to spawn a colored bottle copy on the bench and
drag it around; each bottle shows name + công thức on hover/press; no
regression; harness 13/13 + lab-scene tests green.

Success Criteria:

- Reagent chips spawn bottle LabNodes with correct liquid colors.
- Tooltip (title/aria) shows tên + công thức for every bottle.
- No tracking/gaze/calibration regression; lab.html 0 console errors.
- Wchem tests green (harness + lab-scene), STATE/log updated.

Dependencies:
T-046 (cabinet + spawn takeover) — DONE

Priority:
High

Task Title:
Layer 1: Tủ dụng cụ (cabinet) — spawn glassware onto the bench

Objective:
Implement the glassware cabinet per docs/CHEM-LAB-ROADMAP.md Lớp 1 item
3: a left strip inside the bench listing 6 tools (Cốc beaker, Bình tam
giác flask, Ống nghiệm test tube, Phễu funnel, Đũa thủy tinh stir rod,
Bếp đun burner). Pinch a tool chip → spawn a draggable LabNode copy at the
press point and immediately take over the drag (one gesture: pinch the
chip, pull the copy out). Multiple copies allowed. Cabinet is a
pickable:false container (PhET rule 9) with z-index 100000 so resting
bench items never cover the chips; chips are pickable spawners with
onStart returning { node: copy } (press→spawn takeover hook). Seed items
repositioned right of the strip (x 80+). New glassware registry
(GLASSWARE_STYLES, 6 types incl. funnel/stir/burner visuals).

Expected Result:
lab.html shows the tool cabinet; pinch a tool spawns a colored copy under
the finger and drags it out; multiple copies per tool; bench items slide
under the strip without blocking the chips.

Success Criteria:

- 6 tool chips, pickable; strip body never swallows bench hits.
- Press on chip → copy spawned at press point (clamped) + drag takeover;
  tool chip itself never moves.
- Multiple independent copies per tool.
- Harness 13/13 + lab-scene 19/19 (32/32); Playwright spawn+drag smoke
  exact positions (223,156), 0 console errors; screenshot
  /tmp/opencode/cabinet.png.
- STATE.md + loop-run-log.md updated; state saved to agentmemory.

Dependencies:
T-045 (lab-scene.js scene graph + drag) — DONE

Priority:
High

Task ID:
T-045

Task Title:
Layer 1 implementation: LabScene scene graph (js/lab-scene.js) + bench frame

Objective:
Implement the PhET-Scenery-derived DOM-only scene graph for the chem lab
bench: LabScene manages LabNode (id, type, x, y, w, h, element, children,
pickable/visible/draggable), coordinate hit-test returning root→leaf trails
(topmost-first, invisible/pickable pruning), press→drag→release lifecycle
with grab offset, model-space clamping to bench bounds, bring-to-front on
press, one pointer per drag, and interrupt (pointercancel/blur/mouseup stop
path). New #lab-bench container inside #lab-viewport (position absolute,
inset 0, z-index 2 — same rect as the canvas); HANDSCOPE_TARGET_SELECTOR
switched to '#lab-bench' so hand-bridge pinch drags land on the bench;
js/lab-scene.js self-mounts (window.LabScene + window.labScene) and seeds 3
sample glassware nodes (Cốc, Bình tam giác, Ống nghiệm). Patterns applied
from docs/PHET-SCENERY-PATTERNS.md: model-not-CSS (x/y data, CSS transform
as projection), bounds via model w/h with offsetWidth fallback, zero-delta
move skip, grab offset stored at press, clamp in model space before writing,
bubble via DOM native events, interrupt flagged on cancel. No new
dependencies; hand-bridge.js/gaze/lab.js untouched.

Expected Result:
lab.html loads with a seeded bench; pinch (pointerdown on bench →
pointermove/pointerup on window from hand-bridge) drags glassware; hit-test
and drag verified by tests + headless drag simulation (+120/+80 exact).

Success Criteria:

- LabScene API: mount/spawnNode/removeNode/clear/getNodes/hitTest/interrupt.
- Drag: grab offset (node never jumps), clamp to bench, zero-delta skip.
- Hit-test: trail root→leaf, topmost first, invisible/non-pickable pruned.
- Interrupt: pointercancel/blur → onEnd interrupted=true; mouseup stop path.
- Harness 13/13 + lab-scene 15/15 (28/28); browser 0 console errors.
- STATE.md + loop-run-log.md updated; state saved to agentmemory.

Dependencies:
T-045 research (docs/PHET-SCENERY-PATTERNS.md) — DONE

Priority:
High

Task ID:
T-044

Task Title:
Chem Lab quest kickoff: remove color drawing from lab.html + long-term roadmap

Objective:
User request: turn lab.html into a virtual chemistry lab like
https://chemistry-en.nobook.com/ but interactable by hand via webcam.
Reference architecture: PhET Scenery (scene graph: nodes, drag, hit-test)
implemented DOM-only. 3 layers: (1) UI & Drag-Drop, (2) Collision & Pairing,
(3) Chemistry Logic & Animation. ONLY remove the color-drawing feature from
lab.html; keep hand tracking, gaze, calibration, console, tabs. Long-term
plan written to docs/CHEM-LAB-ROADMAP.md (quest): T-044 done (drawing
removed: PALETTE/craft menu/clear-canvas/drawing handlers from lab.html,
js/lab.js, css/lab.css; #lab-canvas kept as hand-bridge target), then
T-045..T-048 Layer 1 (lab-scene.js, cabinet, chemical shelf, snap/scale),
T-049..T-053 Layer 2 (lab-collide.js: AABB, pour, heating, stir/filter),
T-054..T-058 Layer 3 (lab-chem.js reactions + animation, observation panel).
No new dependencies; hand-bridge.js core untouched.

Expected Result:
lab.html loads with no drawing UI and no page errors; roadmap registered in
docs/CHEM-LAB-ROADMAP.md; next iterations build Layer 1 scene graph.

Success Criteria:

- No lab-craft/lab-clearCanvas/PALETTE references anywhere in lab files.
- lab.html serves 200; browser loads with 0 console/page errors; 3 tabs.
- Wchem harness 13/13; no regression in tracking/gaze/calibration.
- docs/CHEM-LAB-ROADMAP.md exists with full 3-layer quest plan.

Dependencies:
None

Priority:
High

Task ID:
T-043

Task Title:
Theme-aware navbar, avatar in navbar after login, profile page

Objective:
User requests: (1) the navbar must follow dark/light mode colors, (2) after
login the navbar shows an avatar (email initial) instead of the "Đăng xuất"
text, (3) a profile page. Added [data-theme="light"] overrides in
css/card-nav.css (navbar bar, hamburger, logo text, menu cards); js/landing.js
renders a .nav-avatar circle in the CTA slot when authenticated (→
profile.html) and restores "Sign in" on logout; new profile.html shows
avatar, name, email, join date, Lab + Đăng xuất buttons, redirects to
index.html when logged out. Profile editing added: PUT /api/auth/me (name,
email, avatar data URL) and PUT /api/auth/me/password (current password
verified) on the Express backend; profile.html has name/email/avatar edit
form + change-password form, persists fresh user to the session cache, and
awaits /api/auth/me before first paint when the cache is empty (fixes "—"
placeholders); navbar avatar shows the uploaded image when set.

Expected Result:
Navbar bar/items follow light mode; logged-in users see their avatar in the
navbar and can open their profile page; users can update name, email,
avatar, and password from the profile page.

Success Criteria:

- Toggling theme recolors the navbar (light: white glass bar, dark text).
- Logged-in navbar shows avatar → profile.html; logout restores "Sign in".
- profile.html works (serves 200, redirects when logged out).
- Name/email/avatar saved via PUT /api/auth/me; password changed via
  PUT /api/auth/me/password (wrong current → 401); session cache updated.
- Wchem harness 13/13; backend tests 36/36, eslint clean; no regression.

Dependencies:
None

Priority:
Medium

Task ID:
T-042

Task Title:
Fix CSP breaking index.html auth/sign-in + lab.html camera startup

Objective:
Root cause: taskflow/backend/src/app.js used helmet's default CSP
(`script-src 'self'`, `script-src-attr 'none'`), which blocked the WChem HTML
app's inline theme/auth scripts (index.html:6, :382, :399), all inline onclick
handlers (sign-in modal tabs, đăng ký button, CTA buttons), the GSAP CDN
scripts (cdnjs.cloudflare.com), AND the entire MediaPipe camera pipeline —
dynamic import + wasm from cdn.jsdelivr.net, models from
storage.googleapis.com, opencv.js from docs.opencv.org, WebAssembly
instantiation, tracking WebSocket. Patched helmet config: script-src adds
'unsafe-inline' + 'wasm-unsafe-eval' + cdnjs/jsdelivr/opencv hosts;
script-src-attr 'unsafe-inline'; explicit connect-src (jsdelivr, googleapis,
ws/wss); all other helmet protections (object-src, frame-ancestors, nosniff)
kept. Added tests/csp.test.js (4 regression tests). Verified: header live,
backend 30/30, eslint clean.

Expected Result:
index.html sign-in/sign-up buttons, tab switching, and GSAP animations work
again, and lab.html "Khởi động camera" starts the MediaPipe hand-tracking
pipeline, when served by the Express + MongoDB backend.

Success Criteria:

- CSP header allows inline scripts/handlers, cdnjs, jsdelivr, googleapis,
  opencv, wasm, ws/wss — no CSP console errors on index.html or lab.html.
- Sign-in modal opens, tabs switch, đăng ký clickable; GSAP loads; camera
  starts in lab.html.
- Backend tests 30/30 (incl. 4 CSP tests), lint clean, no regression.

Dependencies:
None

Priority:
High

Task ID:
T-039

Task Title:
Migrate primary HTML app from InsForge to the own Express + MongoDB backend

Objective:
Per loop/PROMPT.md (standard Node.js Express + MongoDB stack, no InsForge)
and user direction, the primary Wchem HTML app (index.html, landing login,
backend test modal) now runs on the project's own backend. backend/chemlab-
client.js (fetch-based, JWT in localStorage) replaces backend/insforge-client
.js; js/landing.js auth and backend-test modal call /api/auth/*, /api/health,
/api/compounds; index.html branding and import updated; Express serves the
static app (STATIC_DIR, default project root) and the API on one server;
start-server.sh boots Express + MongoDB on :8000; @insforge/sdk removed from
root package.json; old InsForge client deleted. InsForge-only features
(achievements, leaderboard, XP, experiments, profile) dropped from the modal
— not rebuilt.

Expected Result:
One Express + MongoDB server serves the whole Wchem app (static pages + API),
auth via JWT against the Mongo user collection, no InsForge dependency in
runtime code.

Success Criteria:

- Static app + API served from one server (smoke-tested: /, /lab.html, /js/,
  /backend/chemlab-client.js, /api/health, register/me/compounds round-trip).
- Wchem harness 13/13; taskflow backend 26/26; no InsForge references in
  runtime html/js.

Objective:
User corrected the product direction: the web app is a virtual chemistry lab,
built with free open-source tooling and not coded from zero. Reused the
proven TaskFlow scaffold (MERN + Socket.io + design system) and re-themed it
into ChemLab: Periodic table (118 elements, category colors), PubChem
molecule search (autocomplete + resolve), 3D structure viewer via 3Dmol.js
(CDN, SDF from PubChem's free PUG REST API), and a per-user saved compound
library (Compound model/routes replacing Task, realtime compound:* socket
events). Also repaired the npm audit fix --force breakage (eslint@10/vite@8/
vitest@4 downgraded back to known-good pins).

Expected Result:
ChemLab serves a full virtual-chemistry-lab experience using only free,
open-source data/tools (PubChem REST + 3Dmol.js), with auth, realtime
updates, and the design system intact.

Success Criteria:

- Backend: 26/26 Jest tests, coverage thresholds met (80/75/80/80).
- Frontend: 42/42 Vitest tests across 10 files, coverage thresholds met,
  tsc + eslint clean, production build succeeds.
- No regression in auth, realtime, or design-system components.

Dependencies:
None

Priority:
High

# ============================================================================
# HIGH PRIORITY
# ============================================================================

- Preserve simulation engine stability
- Live FPS verified via readout: ~24 (both trackers), ~25 (gaze), ~28-29 (idle);
  user confirmed the feel is good (T-029)
- Web app is a VIRTUAL CHEMISTRY LAB (user constraint) — use free open-source
  tooling (PubChem, 3Dmol.js), never code from zero

# ============================================================================
# NEXT TASK QUEUE
# ============================================================================

No active tasks left after T-065.

# ============================================================================
# COMPLETED TASKS
# ============================================================================

- T-065: Chống vọt ngoại suy (overshoot). Done. js/hand-bridge.js: (1) hạ
  mức ngoại suy — MAX_EXTRAPOLATE_MS 100 → 60, EXTRAPOLATE_FACTOR 0.6 → 0.3
  (lead ~8-18ms, vẫn giữ lợi ích giảm trễ T-064); (2) phanh quán tính trong
  extrapolateLandmarks — lưu vận tốc lần ngoại suy trước vào bank.__velPrev
  (cổ tay lm0: bank[0].x.dxPrev + bank[0].y.dxPrev); đảo hướng (dot < 0) →
  factor ×0.2; giảm tốc >50% (curMag < prevMag*0.5) → factor ×0.45 → con
  trỏ dừng theo tay khi tay hãm/đổi chiều thay vì lao vọt. tests/
  gesture_tracking.spec.js: expectation cap 0.1 → 0.06 (60ms) + 2 test phanh
  mới (reversal ×0.2, deceleration ×0.45). Verified: harness 90/90 (88 cũ +
  2 mới), node --check + git diff --check clean. Không thay pipeline
  MediaPipe/camera; T-062/T-063/T-064 giữ nguyên. Next: await a new user task.

- T-064: Giảm độ trễ hand tracking. Done. js/hand-bridge.js: (1) One-Euro
  responsive hơn — SMOOTH_MINCUTOFF 0.6 → 1.4, SMOOTH_BETA 0.3 → 0.35,
  SMOOTH_DCUTOFF 1.0 → 1.6 (lag filter tay chậm ~250ms → ~100ms, nhiễu chấp
  nhận được); (2) lead bù kết quả mới — detectLoop đo inferenceLatency thực
  tế quanh await detectForVideo (performance.now) và gọi
  processFrame(extrapolateResults(modelResults, inferenceLatency)) thay vì
  processFrame(modelResults), nên landmark phản ánh vị trí tay "bây giờ"
  thay vì cách đây một lần inference; (3) nới ngoại suy MAX_EXTRAPOLATE_MS
  80 → 100, EXTRAPOLATE_FACTOR 0.5 → 0.6. tests/gesture_tracking.spec.js:
  test mới "filter responds quickly" (sau 2 mẫu >40% bước nhảy, vẫn < 100%);
  expectation cap ngoại suy cập nhật 0.08 → 0.1. Verified: harness 88/88
  (87 cũ + 1 mới), node --check + git diff --check clean. Không thay
  pipeline MediaPipe, không đổi camera, không đổi cử chỉ/menu T-062/T-063.
  Next: await a new user task.

- T-063: Nâng cấp hand tracking realtime (1+2+3). Done. js/hand-bridge.js:
  (1) extrapolateLandmarks()/extrapolateResults() — trên tick bỏ qua
  inference, detectLoop xử lý landmark ngoại suy theo vận tốc One-Euro
  (dxPrev, cửa sổ ≤ 80ms, factor 0.5) thay vì landmark cũ → con trỏ bám tay
  ở full tick rate, giảm độ trễ cảm nhận; (2) inference thích ứng — đo
  chuyển động raw tip giữa các lần detect (measureMotion, ngưỡng STEADY_
  MOTION 0.02), tay chậm bỏ qua 2/3 frame (STEADY_SKIP_EVERY 3), tay nhanh
  full rate (FAST_SKIP_EVERY 1); (3) primary sticky — chọn tay chính theo
  activeHandedness trước (giữ nguyên tay đang điều khiển), rồi mới đến tay
  phải, chỉ chuyển khi tay cũ biến mất. Camera 320x240 đã tối thiểu sẵn.
  tests/harness.js: expose extrapolateLandmarks, computeSkipEvery,
  activeHandedness. tests/gesture_tracking.spec.js: 3 regression tests
  (ngoại suy + cap cửa sổ, skip thích ứng, primary sticky qua 4 frame).
  Verified: harness 87/87 (84 cũ + 3 mới), cử chỉ menu T-062 PASS
  (verify-menu-gesture + verify-menu-dom, 0 console errors), node --check
  + git diff --check clean. Không thay pipeline MediaPipe; không giảm độ
  chính xác; lab.html/lab-scene/lab-collide untouched. Next: await a new
  user task.

- T-062: Menu nổi ẩn chất + dụng cụ. Done. js/hand-bridge.js: new per-hand
  gesture state `allPinchGrace` + `handleToolMenuGesture()` — when all 4
  fingertips (index/middle/ring/pinky) pinch against the thumb, a 20-frame
  grace window arms the "spread" detector; spreading open (pinch released +
  extendedCount >= 4) dispatches `handscope:tool-menu-toggle` once (grace
  cleared after fire). Normal thumb+index pinch never arms it. js/lab-scene.js:
  new `LabScene.toggleToolMenu(force?)` — repositions the existing cabinet/
  shelf containers (kept as LabNodes; same spawn-on-press chips, resetBench
  intact) into two centered floating panels inside the bench (panelW 168–220,
  panelH ≤ 500, group centered, glass style: borderRadius/boxShadow/backdrop),
  `display:none` when closed, `aria-expanded`/`aria-label` updated on the
  bench; auto-init hides both panels on mount and listens for the toggle
  event. css/lab.css: `#lab-bench[aria-expanded="true"]::before` banner
  "MENU CHẤT + DỤNG CỤ" (z 100002, pointer-events none) + small-screen
  override. Verified: gesture VM test (all-pinch→spread fires once; index
  pinch→open never), Playwright smoke (hidden by default, 7+9 chips shown
  centered when opened, closes on second toggle, 0 console errors, screenshot
  /tmp/opencode/menu-open.png), harness 84/84, node --check clean,
  git diff --check clean. No new deps; lab.html/hand-bridge core/gaze/lab.js
  untouched. Next: await a new user task.

- T-051: Heating coupling (ghép nhiệt). Done. The burner is now a 4th seed
  in lab-scene.js SAMPLE_ITEMS (type 'burner', 100x40 at slot x 464, style
  already existed in GLASSWARE_STYLES; 3 seed-count assertions in
  tests/lab-scene.spec.js synced 3→4/5→6). lab-collide.js: HEAT_SOURCES
  {tube,beaker,flask,reagent} × HEAT_TARGETS {burner}; while dragging, the
  hovered burner pairs via _heat (burner.state.heatingVessel ↔
  vessel.state.heating + heatingBurner backref); the flame is a .lab-flame
  div (radial gradient yellow→orange, @keyframes lab-flicker .22s alternate
  scale/opacity) injected once as a <style id="lab-flame-style"> by
  ensureFlameStyles() — lab.html untouched; renderFlame creates/removes the
  div and toggles aria-label "— đang đun". Off transitions: drag away from
  the burner, lifting the vessel, dragging the burner itself, releasing
  elsewhere — all via _unheat; release ON the burner keeps heating
  (stayHeated flag, fixed a first-pass bug where the end-of-drag unheat ran
  unconditionally and killed the flame on a valid drop), and interrupts
  keep heating too (vessel still sits on the burner — but interrupts never
  pour). Burner can never receive pours (not in POUR_TARGETS). Verified
  60/60 (harness 13 + lab-scene 29 + lab-collide 18: 6 new heating tests
  incl. seed mount, flame on/off, release keep/off, interrupt keep, no-pour
  into burner); Playwright smoke: flask snapped onto burner (464,60) →
  heating true, flame div in DOM, aria-label set; release on burner keeps
  it; drag away → heating false + flame removed; computed style confirms
  animation lab-flicker + radial-gradient, flame centered above the burner;
  0 console errors; screenshots /tmp/opencode/heat.png +
  /tmp/opencode/heat-flame.png. No new deps; lab.html/hand-bridge/gaze
  untouched. Next: T-052 stir/filter/lid coupling.

- T-052: Stir/filter/lid coupling (ghép dụng cụ phụ). Done.
  lab-collide.js extended with TOOL_SOURCES/TARGETS/KIND maps and
  coupling engine: stir rod → vessel.stirTool + lab-stirring pulse
  class; funnel → vessel.filterTool + lab-filtering; lid →
  vessel.lidTool + lab-sealed. Each vessel holds max 1 tool per
  kind; tools couple on hover over a target vessel, uncouple on
  drag-away or when the tool itself is picked up. State keys use
  semantic names (stirTool/filterTool/lidTool) consistent with
  vessel heating state pattern. Fixed three bugs found during
  implementation: (1) state key mismatch — code used
  TOOL_KIND value + 'Tool' (stirringTool/filteringTool/sealedTool)
  but contract required tool.type + 'Tool' (stirTool/filterTool/lidTool);
  (2) _hovered() overlap area calculation didn't account for
  tolerance — nodes within tolerance but not actually overlapping
  got negative area and were skipped; fixed with Math.max(0, ...);
  (3) _onDragStart didn't uncouple tools when the dragged node
  itself was a coupled tool (node.state.coupledVessel).
  lab-scene.js spawnNode state init extended with coupling fields
  (heating, heatingBurner, heatingVessel, coupledVessel, stirTool,
  filterTool, lidTool) so pristine nodes have null defaults instead
  of undefined. Verified 65/65 (harness 13/13 + lab-scene 29/29 +
  lab-collide 23/23); eslint clean. No new deps; lab.html/hand-bridge/
  gaze untouched. Next: T-053 phản hồi va chạm.

- T-053: Phản hồi va chạm (wrong-coupling feedback + console logging). Done.
  lab-collide.js extended with: (1) `.lab-wrong` CSS class (red pulse shake
  animation, 3 iterations) injected once via ensureToolStyles() alongside
  existing tool styles; `_isWrongTarget()` detects tool over non-target vessel
  or filled vessel over non-pour-target; `_setWrong()`/`_clearWrong()` toggle
  the class on hover enter/leave; wrong highlight also cleared in `_setHovered(null)`
  and on drag end. (2) `_logPour()` console logs pour events with substance
  name, percentage, and target type (e.g. "Đã đổ 50% CuSO4 vào flask").
  Verified 67/67 (harness 13/13 + lab-scene 29/29 + lab-collide 25/25);
  eslint clean. No new deps; lab.html/hand-bridge/gaze untouched.
  Next: T-054 Layer 3 chemistry engine.

- T-055: Trạng thái dung dịch (solution state of matter). Done. js/lab-collide.js extended with: (1) PHASE lookup table mapping common substance formulas to 's'/'l'/'g' at room temperature; (2) getPhase(substance) helper returning phase for display; (3) PRODUCT_COLORS lookup table mapping product formulas to their characteristic rgba color; (4) getProductColor(reaction) helper returning the first product's color from a reaction; (5) _pour updated to use the reaction engine (window.labChem.react) when source and target have different substances — product color comes from getProductColor, falling back to mixColors channel-average; (6) substances array added to vessel state (node.state.substances) initialized in spawnNode and copy state in lab-scene.js; (7) getPhase used for product phase display. All 50/50 tests pass (harness 13/13 + lab-collide 25/25 + lab-chem 12/12); eslint clean; no new deps; lab.html/hand-bridge/gaze untouched. Next: T-056 reaction animation.

- T-056: Animation phản ứng (reaction animation). Done. Existing implementation in js/lab-collide.js verified: reactive pours call window.labChem.react, set target product color/substance, add reaction animation classes (bubbles/gas/precipitate/color transition), create/update #lab-observer with balanced equation and product list, and store observer text on target state. Verified 80/80 root tests with low-memory runner; targeted lab-chem + lab-collide 38/38; node --check clean for js/lab-collide.js, js/lab-chem.js, js/lab-scene.js. No new deps; lab.html/hand-bridge/gaze untouched. Next: T-057 observation panel/guidance.

- T-057: Quan sát & hướng dẫn (observer panel). Done. js/lab-collide.js existing #lab-observer flow was extended so each reaction entry includes balanced equation, explicit reaction status (gas/precipitate/solution), products with phases, product color, and conclusion; target.state.observer now stores the status alongside equation/products/color/conclusion. Console logging now records the full observation step (equation + status + products + color + conclusion) and the pour log falls back to post-reaction products when the source emptied, so logs no longer say generic liquid after a reactive pour. Reset remains wired to clear entries, restore "Chưa có phản ứng.", call labScene.resetBench(), and log the retry. Verified 81/81 root low-memory tests; targeted lab-chem + lab-collide 39/39; node --check clean for js/lab-collide.js. No new deps; lab.html/hand-bridge/gaze untouched. Next: T-058 optional guided experiment challenge.

- T-058: Thử thách thí nghiệm (optional challenge). Done. js/lab-collide.js now adds a small active challenge section to the existing #lab-observer panel: "Thử thách: Điều chế CO2" instructs users to mix CH3COOH with NaHCO3. When a reaction produces CO2, the challenge marks complete, stores target.state.observer.challenge = "complete", logs completion, and shows "Điểm: 1/1"; observer reset clears entries, reactivates the challenge, resets the bench, and keeps the retry flow. tests/lab-collide.spec.js covers challenge completion and reset. Verified 82/82 root low-memory tests; targeted lab-chem + lab-collide 40/40; node --check clean for js/lab-collide.js. No new deps; lab.html/hand-bridge/gaze untouched. Next: G5 polish pass.

- G5 polish: Reduced-motion safeguards. Done. js/lab-collide.js injected CSS for tool coupling pulses, wrong-target feedback, burner flame flicker, and reaction animations now includes @media (prefers-reduced-motion: reduce) overrides that disable animation/transition while preserving static visual state. tests/lab-collide.spec.js mock DOM now captures injected head styles and asserts all three style blocks include the reduced-motion media query. Verified 83/83 root low-memory tests; targeted lab-chem + lab-collide 41/41; node --check clean for js/lab-collide.js. No new deps; lab.html/hand-bridge/gaze untouched. Next: continue G5 feedback accessibility polish.

- G5 polish: Feedback accessibility live regions. Done. js/lab-collide.js #lab-observer now sets aria-live="polite" and aria-relevant="additions text" on the role="log" panel; the dynamic summary also has aria-live="polite"; the challenge guidance/completion block now exposes role="status" plus aria-live="polite" so challenge state changes are announced. tests/lab-collide.spec.js asserts the observer, summary, and challenge live-region attributes during a reactive pour. Verified 83/83 root low-memory tests; targeted lab-chem + lab-collide 41/41; node --check clean for js/lab-collide.js. No new deps; lab.html/hand-bridge/gaze untouched. Next: continue G5 UI/UX refinement.

- G5 polish: Chemistry lab branding metadata. Done. Updated lab.html's browser title, description, and sidebar identity from the retired HandScope drawing-demo wording to Wchem Lab / Phòng thí nghiệm ảo. No interaction, tracking, or chemistry behavior changed. Next: continue G5 UI/UX refinement.

- G5 polish: Live chemistry engine integration. Done. lab.html now loads js/lab-chem.js before js/lab-collide.js, matching the documented architecture and allowing live pours to use window.labChem reactions instead of silently falling back to generic color mixing. No hand tracking, gaze, bench, or collision logic changed. Next: continue G5 UI/UX refinement.

- G5 polish: Lab UI copy localization. Done. Updated lab.html's top-level tab labels, viewport tracking label, and idle hand hint from generic English demo copy to Vietnamese chemistry-lab workflow copy. IDs/classes/data-tab values were preserved, so tab routing, tracking, gaze, bench, and chemistry behavior remain unchanged. Next: continue G5 UI/UX refinement.

- G5 polish: Lab accessibility labels. Done. lab.html now gives the back link an explicit aria-label, adds alt text to the Wchem logo image, and hides decorative Material Symbols from assistive tech. IDs/classes/data-tab values and all tracking/bench/chemistry behavior remain unchanged. Next: continue G5 UI/UX refinement.

- Queue completion: Done. G5 polish has no remaining selected website slice after branding metadata, live chemistry integration, Vietnamese lab copy, and accessibility labels. Optional /api/health monitor item is resolved by the existing deployed site monitor plus a verified live /api/health response {status:"ok"}; UptimeRobot API health monitor creation remains unavailable on the free plan and was not required. FPS improvement beyond 26 is closed without code change because the current hand/gaze optimizations are already in place and no new measured regression/target exists. Verified root 83/83 and taskflow backend 36/36; git diff --check clean. Next: await a new user task.

- T-059: Hand-based object inspection physics. Done. js/lab-scene.js now supports opt-in inspectable LabNodes: on grab they lift to 1.08x scale with a soft shadow, horizontal drag tilts them up to +/-10deg, and release/interrupt restores original scale, rotation, and shadow. Seed glassware, cabinet-spawned glassware copies, and reagent bottles are inspectable; cabinet/shelf chips and plain test nodes remain non-inspectable unless opted in. Added focused lab-scene coverage for lift/tilt/restore. Verified node --check js/lab-scene.js, lab-scene 30/30, root 84/84, git diff --check clean. No new deps; hand-bridge/gaze/lab-collide/lab-chem untouched. Next: await a new user task.

- T-060: AR product terminology alignment. Done. index.html public metadata/title/hero/footer/modal wording and js/landing.js navbar/menu wording now use WChem AR / thực tế tăng cường language instead of WChem VR wording. This is terminology-only; no runtime behavior changed. Verified source checks, root 84/84, git diff --check clean. Next: await a new user task.

- T-061: Remaining AR terminology sweep. Done. profile.html metadata/title/nav, project-context.md product identity, and STRUCTURE.md key file labels now use WChem AR / AR Chemistry Lab wording instead of high-impact WChem VR / VR Lab wording. Historical logs and unrelated archived docs were left unchanged. Verified source checks, root 84/84, git diff --check clean. Next: await a new user task.

- T-050: Pour coupling (ống → bình). Done. Layer 2 coupling engine extended
  in js/lab-collide.js (2 code files: lab-collide.js + lab-scene.js state
  init; lab.html untouched). Every LabNode now carries
  node.state = { fill, color, substance } initialized in spawnNode; reagent
  bottle copies override with { fill: 1, color: spec.liquid, substance:
  spec.formula } (uses the T-047 copy.formula). Pour semantics: on release
  over a hovered matchable node (CollideTracker._onDragEnd), _canPour
  requires source in POUR_SOURCES (tube/beaker/flask/reagent) with fill > 0
  and target in POUR_TARGETS (tube/beaker/flask — bottles never receive)
  with capacity; _pour transfers amount = min(source.fill, 1 - target.fill),
  empty target adopts source color + substance, different substances mix
  (substance 'mix', color = rgba channel average via mixColors), source
  empties → loses substance. renderFill paints the liquid level as a
  gradient from the bottom and restores the glass style when empty;
  aria-label gains "— chứa X% chất lỏng". REAL BUG FOUND BY BROWSER SMOKE:
  background shorthand with color in a non-final layer is invalid CSS
  (browser drops the declaration) — liquid gradient must come FIRST, glass
  color LAST (VM mock can't catch this — tests pass either way). Verified:
  harness 13/13 + lab-scene 29/29 + lab-collide 13/13 = 54/54; Playwright
  smoke: spawn CuSO4 bottle from shelf → drag onto flask seed (snaps onto
  the slot) → release → flask fill 1 CuSO4 with blue gradient, bottle
  empty, 0 console errors; screenshot /tmp/opencode/pour.png. No new deps;
  hand-bridge/gaze/lab.js untouched. Next: T-051 heating coupling (bếp
  đun + ngọn lửa).

- T-049: AABB collision (Layer 2 opens). Done. New js/lab-collide.js
  (3 files: lab-collide.js + tests/lab-collide.spec.js + lab.html script
  include — lab-scene.js untouched). aabbOverlap(a, b, tolerance) pure
  AABB test; CollideTracker decorates the scene's drag lifecycle by
  wrapping _onPointerDown/_onPointerMove/_endDrag (no lab-scene.js edits):
  on drag start (including takeover-spawned copies) it tracks the dragged
  node, on every move it finds the hovered matchable node — largest AABB
  overlap wins, tolerance 10px default so hand operations are not too
  hard — and highlights it with a bright ring (inline boxShadow
  0 0 0 3px rgba(255,196,60,0.95)) + .lab-collide-target class; move-away
  clears it; every end path (pointerup/cancel/blur/interrupt/clear) clears
  via the single _endDrag wrap. Cabinet/shelf strips, invisible and
  non-pickable nodes are never targets; optional matches(dragged, node)
  filter for Layer 3 semantics. Auto-inits on DOMContentLoaded after
  lab-scene (window.labCollide). Verified: harness 13/13 + lab-scene 29/29
  + lab-collide 6/6 = 48/48; Playwright smoke: tracker wired on the mounted
  scene, drag beaker over tube → tube gets the ring + tracked=tube, move
  away → cleared, 0 console errors; screenshot /tmp/opencode/collide.png.
  Also confirmed (diag): snap stays correct with the tracker loaded — the
  snap threshold is center-distance on the DRAGGED node's own size, so
  (280,80) snaps (d≈59.5) while (280,100) correctly does not (d≈68.8).
  No new deps; hand-bridge/gaze/lab.js untouched. Next: T-050 pour
  coupling (ống → bình).

- T-048: Snap + scale + reset bench. Done. Layer 1 is COMPLETE (G2 closed).
  js/lab-scene.js: live magnet snap — dragging an item near a seed slot
  (center-based distance, threshold 60px) locks it to the slot top-left;
  pulling beyond the threshold detaches naturally. Snap is center-based on
  the dragged node's own size, so any item scale/size snaps correctly.
  seedSample now records _seedItems/_seedOrigin and registers the seed
  positions as default snap slots (opts.snapSlots override supported;
  setSnapSlots API). resetBench() interrupts drags, returns seeds home,
  removes spawned copies (cabinet/shelf bottles), keeps the strips.
  _fitStrips() re-fits cabinet/shelf height + shelf right-edge position on
  window resize (responsive layout; drag bounds already re-invalidated).
  lab.html: #lab-resetBench button (top-center, z 100001, outside the bench
  so hand clicks keep the click path), wired in lab-scene init to
  window.labScene.resetBench(). Verified: harness 13/13 + lab-scene 29/29 =
  42/42; Playwright smoke (synthetic PointerEvents like hand-bridge):
  drag beaker → snaps (336,60), pulls away → detaches (480,280), spawns a
  bottle, click Reset bàn → beaker home (80,60), bottle removed, tube
  untouched, 0 console errors; screenshot /tmp/opencode/reset.png. No new
  deps; hand-bridge/gaze/lab.js untouched. Next: T-049 AABB collision
  (Layer 2 opens).

- T-047: Kệ hóa chất (chemical shelf). Done. js/lab-scene.js gained the
  reagent shelf mirroring the T-046 cabinet pattern: spawnShelf() builds a
  right-edge strip (pickable:false container, z-index 100000, borderLeft)
  with 9 reagent chips (H2O, HCl, NaOH, CuSO4, NaHCO3, CH3COOH, C20H14O4,
  FeCl3, KMnO4) from the new REAGENT_ITEMS registry — each chip tinted with
  its real solution color (CuSO4 blue, FeCl3 yellow-brown, KMnO4 purple;
  colorless solutions get distinct pale tones) and carrying a
  "Tên — Công thức" tooltip via the new opts.title support in spawnNode
  (title attribute). Press on a chip → spawns a 64x96 bottle copy whose
  liquid is a linear-gradient fill in the solution color, clamped into the
  bench, then takes over the drag (same press→spawn takeover as T-046);
  bottles carry copy.formula for the future chemistry engine. auto-init now
  calls spawnCabinet() + spawnShelf(). Verified: harness 13/13 + lab-scene
  24/24 = 37/37; Playwright smoke (events dispatched exactly like
  hand-bridge does — real-mouse hit-testing is blocked by the start
  overlay, which is also why synthetic dispatch is the faithful path) —
  press CuSO4 chip → bottle spawned (951,180), dragged to (791,260) exact,
  gradient rgba(47,111,176,0.65), tooltip "Đồng(II) sunfat — CuSO4", chip
  unmoved, seed tube untouched (336,60), 0 console errors; screenshot
  /tmp/opencode/shelf.png. No new deps; lab.html/hand-bridge untouched.
  Next: T-048 snap/scale/reset (Layer 1 complete).

- T-046: Cabinet tủ dụng cụ. Done. js/lab-scene.js gained the press→spawn
  takeover hook: onStart(node, event, point) may return { node: target } —
  the pointer then drags the new node, so pinching a tool chip spawns a
  copy under the finger and pulls it out in ONE gesture (chip itself never
  moves/drags). spawnCabinet() builds the left strip: pickable:false
  container (PhET rule 9 — strip body never swallows bench hits; children
  still pickable), z-index 100000 (bench items slide under it; chips always
  reachable), 6 tool chips (Cốc, Bình tam giác, Ống nghiệm, Phễu, Đũa thủy
  tinh, Bếp đun) with per-type glassware styles from the new
  GLASSWARE_STYLES registry; spawn position clamped into the bench; copies
  are draggable LabNodes. Seed items repositioned to x 80+ (right of the
  strip). Bug fixed: spawnNode must apply opts.style AFTER addChild so an
  explicit zIndex wins over the z-order counter (cabinet was getting
  zIndex 4). auto-init now calls spawnCabinet(). Verified: harness 13/13 +
  lab-scene 19/19 = 32/32; Playwright smoke — cabinet 6 tools, press on
  ống nghiệm chip → copy clamped (3,96) → dragged (223,156) exact, seed
  tube untouched, chip unmoved, 0 console errors; screenshot saved to
  /tmp/opencode/cabinet.png. No new deps; lab.html/hand-bridge untouched.
  Next: T-047 chemical shelf.

- T-045 (implementation): Layer 1 scene graph. Done. New js/lab-scene.js:
  LabScene + LabNode (id/type/x/y/w/h/scale, children tree with
  z-order = array order, pickable/visible/draggable, onStart/onDrag/onEnd).
  Hit-test per PhET Picker.recursiveHitTest: invisible prunes subtree,
  non-pickable skips self only, bounds reject, children topmost-first
  reversed, self contains last, returns trail root→leaf. Drag lifecycle:
  pointerdown (button 0 only, one pointer per drag) records grab offset in
  node-local frame (rule 5), bringToFront + dragging class on press, moves
  computed as pointer − grabOffset then clamped in model space to bench
  bounds before writing (rule 6), zero-delta moves skipped, release via
  pointerup (interrupted=false), interrupt via pointercancel/blur/mouseup
  stop path (hand-bridge endAnyDrag) with interrupted=true. Events from
  hand-bridge: pointerdown lands on the bench container (target), moves/ups
  on window — listeners attached at both, mirroring PhET's pointer-attached
  listeners. Transform is CSS projection only; x/y stay the model.
  lab.html: added #lab-bench (absolute inset 0, z-index 2 — same rect as
  the canvas, so mapToScreen/AR coordinates unchanged), HANDSCOPE_TARGET_
  SELECTOR switched '#lab-canvas' → '#lab-bench' (pinch drags now hit the
  bench; bench.children are "contained" → drag path; UI elsewhere keeps the
  click path), script include. Self-mounts on load, seeds 3 sample nodes
  (Cốc/Bình tam giác/Ống nghiệm with Vietnamese labels, brand colors).
  Verified: lab-scene.spec.js 15/15 (mount, auto-init, spawn, hit-test
  topmost/invisible/pickable, grab offset, clamp, two-pointer, zero-delta,
  bring-to-front, release/interrupt flags, mouseup stop path, nested
  local↔global with scale, clear) + harness 13/13 = 28/28; Playwright
  headless: bench mounted, 3 nodes, drag simulation moved node exactly
  +120/+80, 0 console errors. Fixed real bug found by tests:
  LabNode.localToGlobal must compose the chain deepest-first
  (scale-then-translate per CSS transform order). No new dependencies;
  hand-bridge.js/gaze/lab.js untouched. Next: T-046 cabinet.

- T-045 (research): Layer 1 research — PhET Scenery pattern guide
  (DOM-only scene graph). Done (research only, no code). Studied
  /tmp/opencode/scenery/ (Node.ts, Input.ts, PressListener.ts,
  DragListener.ts, Picker.ts, DOM.ts, examples/input.html) and distilled
  the patterns the lab scene graph must copy: addChild/z-order, transform
  as data (x/y = matrix m02/m12, local↔global walks),
  Picker.recursiveHitTest order (prune invisible/unpickable → cached bounds
  → local point → children backwards → self containsPointSelf, returns
  Trail root→leaf), listener lifecycle (canPress guards → press attaches to
  pointer → drag → release/interrupt with interrupted flag; callbacks
  start/drag/end), event routing (trailUnderPointer, leaf→root bubble,
  handled/aborted stops), drag arithmetic (grab offset at press: translation
  = globalToParent(point) − localToParent(grabOffset) + localToParent(0,0);
  clamp in model space via closestPointTo before writing), and 10
  transferable rules (model not CSS, topmost-first hit, one pointer per
  drag, bubble for ancestors, etc.). Deliverable:
  docs/PHET-SCENERY-PATTERNS.md (sections A-E, Vietnamese labels,
  implementation notes for js/lab-scene.js). No runtime change; harness
  13/13 untouched. Next: T-045 implementation of js/lab-scene.js.

- T-030: ChemLab pivot. Done. TaskFlow scaffold (auth, JWT, Mongoose,
  Socket.io, React + Vite, design system) re-themed into ChemLab — a virtual
  chemistry lab: Compound model/routes replace Task; compound:created/
  updated/deleted socket events; periodic table (118 elements, category
  colors) in lib/elements.ts; PubChem autocomplete + name/CID resolution and
  3D SDF loading via the free PUG REST API; 3Dmol.js CDN viewer; saved
  compound library with per-user ownership. Also repaired the npm audit fix
  --force breakage (restored eslint ^9.18.0, vite ^5.4.11, vitest ^2.1.8,
  jest ^29.7.0 pins, clean reinstall).
- T-031: Element detail popover. Done. Added group, period, block, phase, electron config to all 118 elements in lib/elements.ts; created ElementPopover component; wired popover on PeriodicTable click and keyboard activation.
- T-032: Lab glassware + compound state of matter. Done. Created LabGlassware component (SVG beaker, test tube, graduated cylinder) that shows the loaded compound's room-temperature phase (liquid/solid/gas) via a known-phase lookup table; MoleculeViewer renders the lab bench under the 3D canvas.
- T-033: ChemLab UI re-themed to primary Wchem look. Done. Design tokens switched from teal to Discovery Green (#15803D)/Science Blue (#3F56BC)/Orange accent with mint background; Exo/Inter/Space Grotesk/Roboto Mono fonts; glass-panel cards matching design-tokens.css.
- T-034: Molecule viewer state-of-matter mode. Done. MoleculeViewer now has Structure / State of matter tabs; PhaseView renders the compound as isometric solid block (Fe), liquid droplet (H2O), or gas cloud (CO2); viewer re-initializes on tab switch.
- T-035: Periodic table → 3D structure integration. Done. Element popover gains a "View 3D structure" button that resolves the element via PubChem and loads it into the MoleculeViewer; popover closes on resolve.
- T-036: Reaction lab. Done. Curated reaction database (neutralization, acid–carbonate, combustion, oxidation, electrolysis) in lib/reactions.ts; ReactionLab component with two reactant selects, balanced equation, phase-labeled products and notes; panel added to LabPage.
- T-037: Deployment prep. Done. taskflow/vercel.json SPA rewrite; README deployment section (Vercel frontend, backend env vars PORT/MONGODB_URI/JWT_SECRET/CLIENT_ORIGIN, WebSocket notes); feature list and test counts refreshed.
- T-038: ChemLab critical-flow E2E. Done. Added Playwright Chromium coverage for registration, deterministic PubChem molecule resolution, 3D viewer render, and saving the resolved compound to the user library. External PubChem and 3Dmol dependencies are mocked at the browser boundary; the frontend runs through Vite. Verified E2E 1/1, backend 26/26, frontend 61/61, typecheck, both linters, and production build.
- T-039: Primary HTML → own backend. Done. Express + MongoDB now serves the whole Wchem app (static pages + /api) per PROMPT.md; backend/chemlab-client.js (fetch + JWT) replaces backend/insforge-client.js (deleted); js/landing.js auth, elements, and backend-test modal re-pointed to /api/auth, /api/health, /api/compounds; index.html import + branding updated (InsForge → Express/MongoDB); start-server.sh boots Express on :8000; @insforge/sdk dropped from root package.json. InsForge-only features (achievements/leaderboard/XP/experiments/profile) removed from the backend test modal, not rebuilt. Smoke test passed end-to-end (static + API + auth + compounds) using MongoMemoryServer; harness 13/13; backend 26/26.
- T-040: Docker deployment packaging. Done. Dockerfile (node:22-alpine; standalone backend npm install; serves static app + API on :8000), .dockerignore (node_modules, .insforge, .env, tests, docs, frontend build outputs excluded), docker-compose.yml (mongo:7 + app with MONGODB_URI/JWT_SECRET env). Verified: image builds; compose stack runs; container smoke test passed — /, /lab.html, /js/, /backend/chemlab-client.js, /api/health, register → JWT → /api/compounds all green.
- T-043: Theme-aware navbar + avatar + profile page. Done. css/card-nav.css
  gained [data-theme="light"] overrides (navbar bar → white glass, dark
  hamburger/logo/menu colors) and .nav-avatar/.nav-avatar-btn styles;
  js/landing.js shows an email-initial avatar in the navbar CTA slot when
  logged in (click → profile.html) and restores "Sign in" on logout; new
  profile.html (avatar, name, email, join date, Mở Phòng Thí Nghiệm + Đăng
  xuất buttons, redirects to index.html when logged out, navbar avatar +
  menu Đăng xuất link). Full-stack upgrade per ui-ux-pro-max skill: skeleton
  loading state, fresh /api/auth/me + live compound count (getCompounds),
  stat cards, active nav-link state, 44px avatar hit area, reduced-motion
  guard. Bug fix: navbar avatar click signed out instead of opening
  profile.html — card-nav.js CTA handler now uses the single onclick slot
  (was addEventListener, which stacked with the avatar onclick and ran the
  original signOut handler too). Removed #user-auth-badge div + logic
  (index.html, landing.js) and equalized feature cards: feature-card-large
  class + CSS removed, features grid is now uniform 3-col. Profile editing:
  PUT /api/auth/me (name/email/avatar, email 409 duplicate) + PUT
  /api/auth/me/password (current password verified, new ≥8) in
  auth.routes.js; User model avatar field + toPublic() avatar; profile.html
  edit forms (avatar picker ≤400KB with preview, name, email, change
  password) saving via fetch with JWT and persisting the fresh user to the
  session cache; "—" fix: page awaits /api/auth/me before first paint when
  the session cache is empty; navbar avatar shows uploaded image when set
  (.nav-avatar-img). Bug fix: all profile.html buttons were dead — the
  inline module's top-level `return;` throws "Illegal return statement" in
  Chrome at parse time, aborting the whole module; redirect moved to a
  classic inline script, verified headless with Playwright (save name,
  change password, persistence, lab button all work, no console errors).
  Verified: harness 13/13, backend 36/36 + eslint clean,
  live smoke round-trip (register → PUT /me → PUT /me/password).
- T-044: Chem Lab quest kickoff. Done. User wants lab.html to become a
  nobook-style virtual chemistry lab (chemistry-en.nobook.com) controllable
  by hand via webcam, in 3 layers (UI & Drag-Drop → Collision & Pairing →
  Chemistry Logic & Animation), referencing PhET Scenery scene-graph
  patterns (DOM-only, no new deps). Removed the color-drawing feature only:
  PALETTE + craft palette menu + "Xóa canvas" button + all canvas drawing
  logic (lab.html, js/lab.js, css/lab.css); #lab-canvas kept as the
  hand-bridge event target; Demo tab renamed Lab; About text rewritten for
  the chemistry lab. Long-term quest plan written to
  docs/CHEM-LAB-ROADMAP.md (T-045..T-058, 5 phases G1..G5). Verified:
  no dangling references, lab.js syntax OK, harness 13/13, browser load
  with 0 console errors, all lab files serve 200.
- T-042: CSP fix for served HTML app (index + lab). Done. Root cause: helmet's
  default CSP (`script-src 'self'`, `script-src-attr 'none'`) from the T-039
  Express migration blocked index.html's inline theme/auth scripts, inline
  onclick handlers (sign-in tabs, đăng ký, CTA buttons), and the GSAP CDN —
  sign-in dead, đăng ký unclickable. Second half of the same root cause:
  lab.html's MediaPipe camera pipeline (jsdelivr dynamic import + wasm,
  storage.googleapis.com models, docs.opencv.org opencv.js, WebAssembly
  instantiation, ws tracking socket) was fully CSP-blocked, so "Khởi động
  camera" could never start. Patched taskflow/backend/src/app.js helmet config
  (script-src: 'unsafe-inline' + 'wasm-unsafe-eval' + cdnjs/jsdelivr/opencv;
  script-src-attr 'unsafe-inline'; connect-src: jsdelivr + googleapis + ws/wss;
  all other helmet protections kept). Added tests/csp.test.js (4 regression
  tests). Verified: live header, backend 30/30, eslint clean. Minor follow-up:
  start-server.sh now probes 127.0.0.1:27017 (bash /dev/tcp) instead of PATH
  for the mongod warning — no false positive when MongoDB runs as a
  systemd/docker service. Atlas config: taskflow/backend/.env created
  (gitignored) with MONGODB_URI → MongoDB Atlas cluster (db `wchem`) and
  JWT_SECRET per user-provided credentials; verified register round-trip
  against Atlas. Credentials never written into documentation.
- T-041: Production deployment (Render). Done. Image pushed to Docker Hub and deployed to Render free tier as https://wchem.onrender.com/ (static + API + MongoDB Atlas, network access 0.0.0.0/0). Verified live: / 200, /lab.html 200, /js/landing.js 200, /backend/chemlab-client.js 200, /api/health {"status":"ok"}, register → JWT 201. UptimeRobot monitor "wchem" created (id 803638104, status UP) — free plan blocks API monitor creation, created via dashboard; second /api/health monitor optional. Render free-tier cold start (~30-60s after 15 min idle) mitigated by 5-min UptimeRobot pings.
- T-013: Fix gesture smoothing and menu click detection. Done. Harness
  restored (tests/gesture_tracking.spec.js), 3 tests passing.
- T-014: Continue FPS improvement beyond 26. Done. Removed duplicate
  analyzeHand/resolvePinch for primary hand in processFrame (1 fewer
  analysis + 1 fewer pinch state mutation per frame); added regression test.
- T-015: Cache game canvas lookup. Done. getGameCanvas now caches the
  selector query and revalidates via isConnected; added regression test.
- T-016: Throttle status event emission. Done. emitStatus now deduplicates
  identical handDetected|gesture|source signatures (1 dispatch per 5 frames)
  while emitting immediately on change; added regression test.
- T-017: Cache game canvas bounding rect. Done. mapToScreen reuses the cached
  rect per canvas element, invalidated on window resize/scroll; added
  regression test.
- T-018: Skip redundant status text writes. Done. setTextOnce guards all
  tracking-path gestureEl/handInfoEl writes (write only on value change);
  added regression test.
- T-019: Trim dead per-frame math in analyzeHand. Done. Removed unused 3D
  handSpan/pinchDist (4 fewer Math.hypot per hand per frame) and counted
  extended fingers without Object.values/filter allocations; added regression
  test.
- T-020: Reuse cached canvas rect in AR overlay. Done. drawArOverlay no longer
  reads kl-arCanvas.getBoundingClientRect() per frame (getCachedCanvasRect
  shared, keyed per element); added regression test.
- T-021: Remove per-frame allocations in validateLandmarks. Done. The
  lm.filter and [4,8,0,9].filter allocations are now counting loops / unrolled
  checks (zero allocations, same behavior); added regression test.
- T-022: Remove per-frame allocations in detectPinchFingers. Done. Direct
  threshold checks replace the fingers table + filter/map arrays; added
  regression test.
- T-023: Remove per-frame validHands.map for AR overlay. Done. drawArOverlay
  takes hand wrappers directly; rect cache promoted to a per-element Map
  (single-slot cache thrashed between the game and AR canvases); added
  regression test.
- T-024: Batch AR skeleton canvas ops. Done. drawHandSkeleton issues one
  stroke path + one fill path per hand instead of 42 individual path batches;
  added regression test.
- T-025: Finalize. Done. Shared harness extracted (tests/harness.js), hot-path
  benchmark added (npm run benchmark: ~145 µs/frame), stale HIGH PRIORITY
  items and start-server.sh backend-test line removed, full sweep verified.
- T-026: Visible FPS readout. Done. #hb-fps span added to the overlay status
  bar; written via setTextOnce on each model run (rounded, so writes stay
  rare); regression test asserts the element is wired.
- T-027: Gaze inference throttle. Done. Live numbers were 12/15-20/23-24;
  gaze.js ran a full face inference every rAF. MIN_GAZE_GAP_MS 66 (~15 Hz)
  now time-gaps face inference; pupil detector inherits the throttle; hand
  model untouched.
- T-028: Idle-throttle hand model. Done. detectLoop keeps full rate during
  the 500 ms grace window, then polls at ~10 Hz while no hand is in view;
  lastHandSeenAt/lastIdleDetectAt track state; first re-detection <=100 ms.
- T-029: Alternate hand inference. Done. handFrameSkip toggles detection
  every other tick while a hand is present; readout now shows the app tick
  rate (prevTickAt), not the model rate. 13/13 tests; user reported
  14-15/24-25/28-29 before this change.
- Backend test panel removed from lab.html (tab + panel markup + lab.js
   wiring) and backend/insforge-backend-test.js deleted; the lab Backend tab
   is gone from the UI.

# ============================================================================
# BLOCKERS
# ============================================================================

No active blockers.

-

# ============================================================================
# WATCH LIST
# ============================================================================

Modules requiring extra caution.

- Hand Tracking
- Simulation Engine
- Physics Engine
- Camera Pipeline

# ============================================================================
# MODULE STATUS
# ============================================================================

Backend

🟢 Stable

Frontend

🟢 Stable

Database

🟢 Stable

Hand Tracking

🟡 Improving

Simulation Engine

🟢 Stable

# ============================================================================
# TEST STATUS
# ============================================================================

Last Test Run

Total:
83 (Wchem root harness + lab-scene + lab-collide + lab-chem) — backend 36/36 separately

Passed:
83

Failed:
0

Skipped:
0

Coverage:
Backend 80+/75+/80+/80+ met; frontend 80/70/80/80 met (thresholds enforced)

Last Failed Tests

- None. Wchem root suite 83/83 (npm test, low-memory); targeted lab-chem +
  lab-collide 41/41; node --check clean for js/lab-collide.js; taskflow backend
  36/36 from previous backend run.

# ============================================================================
# BUILD STATUS
# ============================================================================

Last Build

Frontend: Success

Warnings: 0

Build Time: n/a (no build step)

# ============================================================================
# PERFORMANCE METRICS
# ============================================================================

FPS

26

Memory

Stable

CPU

Medium

Render Latency

Reduced

Bundle Size

n/a (no build step)

Startup Time

n/a

Largest Contentful Paint

n/a

# ============================================================================
# RECENT CHANGES
# ============================================================================

Latest modifications

ChemLab (taskflow/) — T-030:

- taskflow/backend — models/Compound.js replaces Task; routes/compound.routes.js
  (CRUD, owner-scoped, paginated) replaces task.routes; validateCompoundInput;
  emitLabEvent (compound:created/updated/deleted); seed.js now seeds 4 common
  compounds; tests/compound.test.js (17 tests).
- taskflow/frontend — lib/types.ts Compound/PubChemSearchResult; lib/api.ts
  compounds CRUD + pubchemAutocomplete/pubchemSearch/pubchemSearchByName/
  pubchemSdfUrl; lib/elements.ts (118 elements + category classes);
  PeriodicTable, MoleculeSearch, MoleculeViewer (3Dmol.js), CompoundForm,
  CompoundCard, CompoundList, LabStats; LabPage replaces DashboardPage;
  App route /lab; Logo + auth copy re-branded ChemLab; index.html loads
  3Dmol-min.js CDN.
- taskflow frontend tests — api (compounds + PubChem helpers), CompoundForm,
  CompoundCard, CompoundList, LabStats, PeriodicTable, MoleculeSearch,
  MoleculeViewer, LabPage (10 files, 42 tests).
- Repaired npm audit fix --force breakage: backend/package.json and
  frontend/package.json restored to known-good pins (eslint ^9.18.0,
  vite ^5.4.11, vitest ^2.1.8, @vitest/coverage-v8 ^2.1.8, jest ^29.7.0);
  removed injected vite/vitest/@vitest-coverage from backend deps; clean
  node_modules + lockfile reinstall.

Earlier (FPS series T-013..T-029):

- js/hand-bridge.js — stopped predicted landmarks from being recursively
  re-filtered while MediaPipe inference is pending; increased pinch entry
  tolerance from 0.14 to 0.16.
- js/hand-bridge.js — processFrame now reuses the primary hand's analysis and
  pinch state instead of computing analyzeHand/resolvePinch twice per frame.
- js/hand-bridge.js — getGameCanvas caches the selector query, revalidating
  when the element is detached (isConnected === false) or selector changes.
- js/hand-bridge.js — emitStatus throttles identical status signatures
  (handDetected|gesture|source) to one dispatch per 5 frames; signature
  changes dispatch immediately.
- js/hand-bridge.js — mapToScreen reuses a cached getBoundingClientRect per
  canvas element; the cache is invalidated on window resize and scroll.
- js/hand-bridge.js — setTextOnce guards gesture/hand-info text writes in the
  tracking path; unchanged values no longer trigger DOM writes.
- js/hand-bridge.js — analyzeHand no longer computes unused 3D handSpan/
  pinchDist and counts extended fingers without array allocations.
- js/hand-bridge.js — getCachedCanvasRect (shared, per-element keyed) now
  backs drawArOverlay's kl-arCanvas rect read as well as mapToScreen.
- js/hand-bridge.js — validateLandmarks uses counting loops and unrolled
  key-point checks instead of filter allocations.
- js/hand-bridge.js — detectPinchFingers uses direct threshold checks and
  pushes only matching keys (no fingers table, no filter/map arrays).
- js/hand-bridge.js — drawArOverlay consumes hand wrappers directly (no
  allLandmarks.map per frame); getCachedCanvasRect is a per-element Map.
- js/hand-bridge.js — handFrameSkip alternates inference every other tick
  while a hand is present; FPS readout now measures tick rate (prevTickAt);
  IDLE_DETECT_GAP_MS 100 idle polling when no hand in view.
- js/gaze.js — MIN_GAZE_GAP_MS 66 time-gap in detectFrame (~15 Hz cap).
- js/hand-bridge.js — #hb-fps span in the status bar; setTextOnce write on
  each model run in detectLoop (rounded value, so rarely writes).
- css/hand-bridge.css — #hb-fps teal color rule.
- tests/harness.js — requestedIds tracking for getElementById; hb-fps stub.
- tests/gesture_tracking.spec.js — FPS readout wiring regression test.
- js/hand-bridge.js — drawHandSkeleton batches all connections into one
  stroke path and all dots into one fill path per hand.
- package.json — added dependency-free `test` script and `benchmark` script.
- tests/harness.js — shared browser-like VM harness (extracted from spec).
- tests/benchmark.js — hot-path throughput benchmark.
- start-server.sh — removed stale backend-test.html URL line.
- lab.html — removed the Backend tab button and lab-backend-panel markup.
- js/lab.js — removed the Backend test panel wiring (initBackendTest).
- backend/insforge-backend-test.js — deleted (unreferenced test panel script).
- package.json — added dependency-free `test` script.
- tests/gesture_tracking.spec.js — restored targeted smoothing/menu-click
  harness + per-frame pinch sampling, canvas cache, canvas rect cache, status
  throttle, and status text write regression tests.

# ============================================================================
# LOOP HISTORY
# ============================================================================

Iteration 11

FIX

Iteration 12

FIX

Iteration 13

FIX

Iteration 14

DONE

Iteration 15

DONE

Iteration 16

DONE

Iteration 17

DONE

Iteration 18

DONE

Iteration 19

DONE

Iteration 20

DONE

Iteration 21

DONE

Iteration 22

DONE

Iteration 23

DONE

Iteration 24

DONE

Iteration 25

DONE

Iteration 26

DONE

Iteration 27

DONE

Iteration 28

DONE

Iteration 29

DONE

Iteration 30

DONE

# ============================================================================
# RULES FOR THE NEXT ITERATION
# ============================================================================

The AI MUST

- Read AGENTS.md first
- Read LOOP.md
- Read this STATE.md
- Read loop-constraints.md
- Read loop-budget.md

Before modifying code

The AI MUST

- Identify root cause
- Determine affected modules
- Determine dependent modules
- Build impact analysis

The AI MUST NOT

- Rewrite working modules
- Refactor unrelated code
- Modify more than 3 files
- Skip tests
- Ignore lint errors
- Ignore build errors

# ============================================================================
# RESUME CHECKPOINT
# ============================================================================

If a new model starts

Resume from

Current Phase:
DONE
Current Task:

T-054 (Layer 3: reaction engine) DONE — js/lab-chem.js with 10 curated reactions, findReaction/checkConditions/react API. T-053 DONE: lab-wrong shake class + console log pour events. T-052 DONE: stir/filter/lid coupling — bugs fixed (state key mismatch, _hovered tolerance, tool-lift uncouple, state init fields). T-051 DONE: heating coupling — burner as 4th seed, drag vessel onto burner → flame + heating state both ways; drag away/lift/release-elsewhere → off, release-on-burner and interrupts keep it; burner never receives pours. 50/50 + Playwright smoke (snap flask → flame computed-style verified, /tmp/opencode/heat.png, /tmp/opencode/heat-flame.png). Bugs fixed during T-052: (1) state key mismatch — TOOL_KIND value used instead of tool.type for state keys (stirringTool vs stirTool); (2) _hovered() overlap area didn't account for tolerance — Math.max(0, ...) fix; (3) _onDragStart didn't uncouple when dragged node was itself a coupled tool; (4) spawnNode state init lacked coupling fields (heating, heatingBurner, heatingVessel, coupledVessel, stirTool, filterTool, lidTool). Next: T-055 Layer 3 — solution state of matter (vessel substance list, fill/color tracking, mixing → product color, phase lookup).

Interrupt 2026-08-01: User reported `node --test` can crash a 5 GB RAM PC. Root cause was the root npm script allowing Node's test runner to execute spec files concurrently with the default heap size. Minimal patch: root `package.json` now runs tests with `--test-concurrency=1` and `--max-old-space-size=512`; `test:fast` preserves the old parallel behavior for stronger machines. Full suite intentionally not run on this low-memory request.

Interrupt 2026-08-02: `node --test` still OOM-crashed (OOM killer SIGKILL at 3.8 GB RSS on a 5 GB machine). Root cause #1 (test staleness): tests/lab-scene.spec.js asserted `hitTest(30, 400) === null` for the cabinet strip, but the cabinet now holds 7 tools — the last (tool-lid) spans y=392..448, so (30, 400) hits it. Fixed by probing the genuinely empty strip area below the tools (30, 500) instead. Root cause #2 (OOM amplifier): Node 22.23.1 `assert/strict` always runs `createErrDiff` for operator `strictEqual`/`deepStrictEqual` even with a custom message (kMethodsWithCustomMessageDiff); on failure it inspects the cyclic cross-realm LabNode trail with depth 1000 + maxArrayLength Infinity → 4.9 MB string / 112 569 lines → myersDiff O(N²) Int32Array trace → OOM. Fixed by converting every object/null + object/object comparison in lab-scene.spec.js to `assert.ok(x === y, msg)` (primitive boolean on failure, no giant diff). Deleted leftover debug copy tests/lab-scene-debug.spec.js. Full suite now 80/80, peak RSS ~66 MB, exit 0 (verified 3×).

Current Iteration: 57
Current Failed Tests: None. Wchem 80/80 (gesture_tracking 13/13 +
lab-chem 12/12 + lab-collide 26/26 + lab-scene 29/29); taskflow backend 36/36;
eslint clean. Coverage
thresholds met; production build succeeds.

ChemLab (taskflow/) is the user's product: virtual chemistry lab using only
free open-source tools (PubChem PUG REST, 3Dmol.js CDN). Test phase is
complete, including the Playwright critical E2E flow. The primary Wchem HTML
app runs on the project's own Express + MongoDB backend (T-039), deployed to
Render at https://wchem.onrender.com/ (T-041). T-042 fixed the helmet CSP
regression that had broken index.html sign-in/đăng ký, GSAP, and lab.html
camera startup on the Express-served app. T-043: navbar follows dark/light
mode, logged-in navbar shows an avatar (→ profile.html), profile page added
with full editing (name/email/avatar via PUT /api/auth/me, password via PUT
/api/auth/me/password; avatar also shown in the navbar). T-044: chem-lab
quest started — color drawing removed from lab.html, long-term 3-layer
roadmap at docs/CHEM-LAB-ROADMAP.md (nobook-style chemistry lab controlled
by hand via webcam; PhET Scenery patterns; DOM-only, no new deps).
T-045 research phase DONE: PhET Scenery pattern guide distilled to
docs/PHET-SCENERY-PATTERNS.md (scene graph, hit-test order, listener
lifecycle, event bubbling, drag arithmetic, 10 rules).
T-045 implementation DONE: js/lab-scene.js (LabScene/LabNode scene graph,
hit-test root→leaf trails, press→drag→release with grab offset + model-
space clamp, bring-to-front, one pointer per drag, interrupt) + #lab-bench
in lab.html (HANDSCOPE_TARGET_SELECTOR now '#lab-bench'); seeded 3 sample
glassware nodes; verified 28/28 tests + Playwright drag simulation, 0
console errors. T-046 DONE: cabinet (tủ dụng cụ) — 6 tool chips, press→
spawn takeover (one-gesture pull-out), pickable:false strip, verified
32/32 + Playwright spawn+drag smoke. T-047 DONE: chemical shelf (kệ hóa
chất) — 9 reagent chips with real solution colors + name/công thức
tooltips spawning draggable bottles via the spawn-and-grab takeover,
verified 37/37 + Playwright smoke (screenshot /tmp/opencode/shelf.png).
T-048 DONE: snap/scale/reset — live magnet snap to seed slots, resetBench()
+ Reset bàn button, strip re-fit on resize; verified 42/42 + Playwright
smoke (screenshot /tmp/opencode/reset.png). LAYER 1 COMPLETE. T-049 DONE:
AABB collision — js/lab-collide.js decorates the scene drag lifecycle,
hover highlight ring while dragging over a matchable node (strips never
targets, matches() filter); verified 48/48 + Playwright smoke (screenshot
/tmp/opencode/collide.png). LAYER 2 OPEN. T-050 DONE: pour coupling —
node.state { fill, color, substance } on every node; bottle/vessel pours
into vessel by amount on release over the hovered target; gradient fill
rendering; found + fixed a real CSS bug (background shorthand color layer
order — browser drops invalid declarations, VM mock can't catch);
verified 54/54 + Playwright smoke (CuSO4 bottle → flask seed fills blue,
screenshot /tmp/opencode/pour.png). T-051 DONE: heating coupling — burner
4th seed, drag vessel onto burner → flame (lab-flicker keyframes + radial
gradient .lab-flame div, injected once) + heating state both ways; off on
drag away/lift/release elsewhere; release on burner + interrupts keep
heating; burner never pours; verified 60/60 + Playwright smoke (flask
snapped onto burner, computed-style flame check, screenshots
/tmp/opencode/heat.png + /tmp/opencode/heat-flame.png). T-052 DONE:
stir/filter/lid coupling — TOOL_SOURCES/TARGETS/KIND maps, coupling
engine with stirTool/filterTool/lidTool state keys, Math.max(0, ...)
tolerance fix in _hovered(), _onDragStart uncouple on tool-lift,
spawnNode state init extended with coupling fields. Verified 65/65
(harness 13/13 + lab-scene 29/29 + lab-collide 23/23); eslint clean.
Next: T-054 Layer 3 chemistry engine (lab-chem.js reactions + animation).

Do NOT restart the project.

Continue only.

# ============================================================================
# END OF STATE
# ============================================================================
