# loop-run-log.md

# ============================================================================
# LOOP RUN LOG
# ============================================================================

Project:
Wchem

Framework:
Loop Engineering

Runtime:
OpenCode

Retention:
30 Days

Older entries may be archived.

==============================================================================
LATEST RUN
==============================================================================

Run ID:
2026-08-02T13:02:54+07:00

Iteration:
59

Task:
T-056 Layer 3: Animation phản ứng (reaction animation)

Changes:
- Resumed from STATE.md + memory request and confirmed T-056 implementation already exists in `js/lab-collide.js`.
- Verified reactive pours use `window.labChem.react`, update target product substance/color, apply `.lab-reaction-bubbles` / `.lab-reaction-gas` / `.lab-reaction-precipitate` animation classes, and record balanced equation + products in `#lab-observer`.
- Updated `STATE.md` to mark T-056 done and set next current task to T-057 observation panel/guidance.

Tests:
- Targeted: `node --max-old-space-size=512 --test --test-concurrency=1 tests/lab-chem.spec.js tests/lab-collide.spec.js` -> 38/38 pass.
- Full root low-memory suite: `npm test` -> 80/80 pass.
- Syntax: `node --check js/lab-collide.js && node --check js/lab-chem.js && node --check js/lab-scene.js` -> pass.

Current Phase:
DONE

Outcome:
Success

Next Task:
T-057 Layer 3: Quan sát & hướng dẫn (observer panel)

-------------------------------------------------------------------------------

Run ID:
2026-08-02T14:00:00+07:00

Iteration:
58

Task:
Fix node --test OOM crash (3.8 GB RSS → SIGKILL) on 5 GB machine

Changes:
- Root cause #1 (stale assertion): `tests/lab-scene.spec.js` cabinet-strip test
  asserted `hitTest(30, 400) === null`, but the cabinet now spawns 7 tools —
  the last (tool-lid) spans y=392..448, so (30, 400) hits the lid. Fixed by
  probing the genuinely empty strip area below all tools: `hitTest(30, 500)`
  (strip h=600, tools end at y=448).
- Root cause #2 (OOM amplifier): Node 22.23.1 `assert/strict` ALWAYS generates
  an error diff for operators strictEqual/deepStrictEqual even with a custom
  message (kMethodsWithCustomMessageDiff). On assertion failure it inspected
  the cyclic cross-realm LabNode trail with `{ depth: 1000,
  maxArrayLength: Infinity, getters: true, sorted: true }`, producing a
  4.9 MB / 112 569-line string, then ran myersDiff (O(N²), Int32Array trace
  cloned per level) → RAM explosion → OOM killer.
- Fix: converted every object-vs-null and object-vs-object assertion in
  `tests/lab-scene.spec.js` to `assert.ok(x === y, msg)` — on failure the
  actual value is a boolean, so no giant diff can ever be generated again.
- Removed leftover debug copy `tests/lab-scene-debug.spec.js` (was matched by
  the `tests/*.spec.js` glob and would run in the suite).

Tests:
- Full suite `node --max-old-space-size=512 --test --test-concurrency=1 tests/*.spec.js`:
  80/80 pass, 0 fail, peak RSS 66 MB (was 3.9 GB + OOM SIGKILL), exit 0.
- Re-run twice more: 80/80 pass each time (stable).

Current Phase:
DONE

Outcome:
Success

-------------------------------------------------------------------------------

Run ID:
2026-08-01T19:40:00+07:00

Iteration:
57

Task:
Low-memory test policy rule

Changes:
- Added a binding test-policy rule in `loop-constraints.md`: run `npm test` only for the smallest affected area first; avoid project-wide `npm test` unless explicitly requested or after smaller tests pass on a machine with enough memory.

Tests:
- Not run; documentation/rule-only change.

Outcome:
Success

------------------------------------------------------------------------------

Run ID:
2026-08-01T19:25:00+07:00

Iteration:
56

Task:
Low-memory root Node test safety

Changes:
- Updated root `package.json` `test` script to cap Node heap at 512 MB and force `--test-concurrency=1`.
- Added `test:fast` for the previous uncapped parallel behavior on higher-memory machines.

Tests:
- Full test suite not run by request/context: the issue is low RAM and full `node --test` may crash the PC.
- Lightweight verification only: package script syntax reviewed.

Notes:
- This change affects only root Wchem tests (`tests/*.spec.js`). It does not alter app code, hand tracking, rendering, or the simulation engine.

Current Phase:
DONE

Outcome:
Success

------------------------------------------------------------------------------

Run ID:
2026-08-01T19:05:00+07:00

Iteration:
55

Task:
T-055 Layer 3: Trạng thái dung dịch (solution state of matter)

Changes:
- Added PHASE lookup table (solid/liquid/gas) and getPhase() helper to js/lab-collide.js
- Added PRODUCT_COLORS lookup table and getProductColor(reaction) helper to js/lab-collide.js
- Updated _pour in js/lab-collide.js to use reaction engine (window.labChem.react) for product color when mixing different substances; falls back to mixColors channel-average
- Added substances array to vessel state in js/lab-scene.js spawnNode and reagent bottle copy init
- Fixed duplicate PHASE/PRODUCT_COLORS tables and syntax errors (Cu(OH)2 unquoted key)

Tests:
- 50/50 pass (harness 13/13 + lab-collide 25/25 + lab-chem 12/12)
- eslint clean

Notes:
- T-052..T-054 all verified complete; T-055 complete; T-056 (reaction animation) next

Current Phase:
DONE

Current Task:
T-051 implementation — ghép nhiệt (heating coupling, Layer 2)

Duration:
13m 20s

Outcome:
Success

------------------------------------------------------------------------------
SUMMARY
------------------------------------------------------------------------------

Objective

Per docs/CHEM-LAB-ROADMAP.md Lớp 2 item 3: drag a vessel onto the burner
(bếp đun) → heating state with a simple flame animation; drag away → off.

Result

Burner became the 4th seed (lab-scene.js SAMPLE_ITEMS, 100x40 at slot
x 464; GLASSWARE_STYLES.burner already existed; 3 seed-count assertions
in tests/lab-scene.spec.js synced). lab-collide.js gained HEAT_SOURCES
{tube,beaker,flask,reagent} × HEAT_TARGETS {burner}, _canHeat/_heat/
_unheat, ensureFlameStyles (injects <style id="lab-flame-style"> with
.lab-flame + @keyframes lab-flicker — lab.html untouched), and
renderFlame (creates/removes the flame div; aria-label "— đang đun").
Lifecycle: hover the burner while dragging → heat; drag away / lift the
vessel / drag the burner itself / release elsewhere → unheat; release ON
the burner or an interrupted drag → stays heated (interrupts never pour).
Burner can never receive pours.

FIRST-PASS BUG FIXED (unit tests caught it): the end-of-drag unheat ran
unconditionally, killing the flame even on a valid drop onto the burner —
added a stayHeated flag; interrupts also keep heating (vessel still sits
on the burner).

No regression detected.

------------------------------------------------------------------------------
FILES MODIFIED
------------------------------------------------------------------------------

js/lab-scene.js

- SAMPLE_ITEMS gains the burner seed (type 'burner', w 100, h 40).

js/lab-collide.js

- HEAT_SOURCES/HEAT_TARGETS, ensureFlameStyles, renderFlame, _canHeat,
  _heat, _unheat; _onDragStart lifts heating off, _onDragMove pairs/
  unpairs with the burner, _onDragEnd keeps heating on valid drops.

tests/lab-collide.spec.js

- 6 new heating tests (seed mount, flame on/off, release keep/off,
  interrupt keep, no-pour into burner + empty vessel can heat).

tests/lab-scene.spec.js

- 3 seed-count assertions synced (3→4, 5→6, slots 3→4).

lab.html

- unchanged this task.

------------------------------------------------------------------------------
BUILD
------------------------------------------------------------------------------

Backend

Not Required

Frontend

PASS

Warnings

0

------------------------------------------------------------------------------
TEST RESULTS
------------------------------------------------------------------------------

Total

60

Passed

60

Failed

0

Coverage

n/a (Wchem)

------------------------------------------------------------------------------
FAILED TESTS
------------------------------------------------------------------------------

None.

------------------------------------------------------------------------------
PERFORMANCE
------------------------------------------------------------------------------

FPS

n/a (no MediaPipe changes)

Memory

Stable

CPU

Low (animation is pure CSS keyframes)

Render Latency

Unchanged

------------------------------------------------------------------------------
NEXT ITERATION
------------------------------------------------------------------------------

Current Phase

DONE

Next Task

T-052 (Layer 2 item 4): stir/filter/lid coupling — đũa khuấy vào bình
(khuấy tăng tốc hòa tan), phễu lên miệng bình (lọc), nắp đậy (cô lập khí).

Maximum Files

3

Priority

High

------------------------------------------------------------------------------
STATE UPDATE
------------------------------------------------------------------------------

STATE.md

Updated

loop-run-log.md

Updated

------------------------------------------------------------------------------
JSON RECORD
------------------------------------------------------------------------------

```json
{
  "run_id": "2026-08-01T19:05:00+07:00",
  "iteration": 52,
  "phase": "DONE",
  "task": "T-051 heating coupling (Layer 2)",
  "files_changed": 4,
  "tests": {
    "total": 60,
    "passed": 60,
    "failed": 0
  },
  "outcome": "success",
  "next_task": "T-052 stir/filter/lid coupling"
}
```

==============================================================================
HISTORY
==============================================================================

Run ID:
2026-08-01T18:50:00+07:00

Iteration:
51

Current Phase:
DONE

Current Task:
T-050 implementation — ghép nối đổ chất lỏng (pour coupling, Layer 2)

Duration:
12m 40s

Outcome:
Success

------------------------------------------------------------------------------
SUMMARY
------------------------------------------------------------------------------

Objective

Per docs/CHEM-LAB-ROADMAP.md Lớp 2 item 2: drag a test tube to the mouth
of a flask/beaker → pour (the vessel receives liquid); drag a vessel onto
another vessel → cross-pour. Builds on the T-049 collision tracker.

Result

Every LabNode now carries node.state = { fill, color, substance }
(spawnNode init; reagent bottles from the T-047 shelf get fill 1 + the
reagent's solution color + công thức). js/lab-collide.js gained
POUR_SOURCES (tube/beaker/flask/reagent), POUR_TARGETS (tube/beaker/flask —
bottles never receive), parseRgba/mixColors (channel-average mixing),
renderFill (liquid level gradient from the bottom; empty restores the
glass style; aria-label gains "— chứa X% chất lỏng"), _pour
(amount = min(source.fill, 1 - target.fill); empty target adopts source
color + substance; different substances → 'mix').

REAL BROWSER BUG FOUND + FIXED: background shorthand with the glass color
in a NON-FINAL layer is invalid CSS — the browser silently drops the whole
declaration, so the flask never showed the liquid (VM mock can't catch
this). Fixed by emitting the liquid gradient FIRST and the glass color
LAST. Playwright smoke confirmed: flask fill 1 + CuSO4 blue gradient over
green glass, bottle emptied, 0 console errors (screenshot
/tmp/opencode/pour.png).

No regression detected.

------------------------------------------------------------------------------
FILES MODIFIED
------------------------------------------------------------------------------

js/lab-scene.js

- spawnNode initializes node.state = { fill: 0, color: null, substance: null }.
- Reagent shelf copies set state { fill: 1, color: spec.liquid, substance: spec.formula }.

js/lab-collide.js

- POUR_SOURCES / POUR_TARGETS, parseRgba/mixColors, renderFill, _pour.
- CollideTracker._onDragEnd: hovered + _canPour → _pour (interrupted drags never pour).

tests/lab-collide.spec.js

- 6 new pour tests: state init, tube→flask pour + glass bg restore (makeEl
  mock gained getAttribute; spawn call passes style.background), capacity +
  mix (float-safe 1e-9), reagent→beaker, no-pour into reagent + empty source,
  interrupted drag never pours.

lab.html

- unchanged this task.

------------------------------------------------------------------------------
BUILD
------------------------------------------------------------------------------

Backend

Not Required

Frontend

PASS

Warnings

0

------------------------------------------------------------------------------
TEST RESULTS
------------------------------------------------------------------------------

Total

54

Passed

54

Failed

0

Coverage

n/a (Wchem)

------------------------------------------------------------------------------
FAILED TESTS
------------------------------------------------------------------------------

None.

------------------------------------------------------------------------------
PERFORMANCE
------------------------------------------------------------------------------

FPS

n/a (no MediaPipe changes)

Memory

Stable

CPU

Low

Render Latency

Unchanged

------------------------------------------------------------------------------
NEXT ITERATION
------------------------------------------------------------------------------

Current Phase

DONE

Next Task

T-051 (Layer 2 item 3): heating coupling — drag a vessel onto the burner
(bếp đun) → heating state + simple flame animation; drag away → off.

Maximum Files

3

Priority

High

------------------------------------------------------------------------------
STATE UPDATE
------------------------------------------------------------------------------

STATE.md

Updated

loop-run-log.md

Updated

------------------------------------------------------------------------------
JSON RECORD
------------------------------------------------------------------------------

```json
{
  "run_id": "2026-08-01T18:50:00+07:00",
  "iteration": 51,
  "phase": "DONE",
  "task": "T-050 pour coupling (Layer 2)",
  "files_changed": 3,
  "tests": {
    "total": 54,
    "passed": 54,
    "failed": 0
  },
  "outcome": "success",
  "next_task": "T-051 heating coupling"
}
```

==============================================================================
HISTORY
==============================================================================

Run ID:
2026-08-01T18:10:00+07:00

Iteration:
50

Current Phase:
DONE

Current Task:
T-049 implementation — va chạm AABB + highlight (Layer 2 opens)

Duration:
4m 18s

Outcome:
Partial Success

------------------------------------------------------------------------------
SUMMARY
------------------------------------------------------------------------------

Objective

Improve MediaPipe processing performance.

Result

FPS improved from 18 → 26.

Menu interaction unchanged.

No regression detected.

------------------------------------------------------------------------------
FILES MODIFIED
------------------------------------------------------------------------------

js/hand-bridge.js

- Reduced duplicate landmark calculations.
- Cached frame transforms.

js/lab.js

- Optimized render scheduling.

------------------------------------------------------------------------------
BUILD
------------------------------------------------------------------------------

Backend

Not Required

Frontend

PASS

Warnings

0

------------------------------------------------------------------------------
TEST RESULTS
------------------------------------------------------------------------------

Total

128

Passed

126

Failed

2

Coverage

86%

------------------------------------------------------------------------------
FAILED TESTS
------------------------------------------------------------------------------

1.

gesture_tracking.spec.ts

Expected

Stable tracking

Actual

Occasional landmark jitter

Root Cause

Frame interpolation unstable.

Next Action

Adjust temporal smoothing.

----------------------------------------

2.

menu_click.spec.ts

Expected

Reliable click detection

Actual

False negatives

Root Cause

Gesture threshold too strict.

Next Action

Tune click threshold.

------------------------------------------------------------------------------
PERFORMANCE
------------------------------------------------------------------------------

FPS

26

Memory

Stable

CPU

Medium

Render Latency

Reduced

------------------------------------------------------------------------------
NEXT ITERATION
------------------------------------------------------------------------------

Current Phase

FIX

Next Task

Improve gesture smoothing.

Maximum Files

3

Priority

High

------------------------------------------------------------------------------
STATE UPDATE
------------------------------------------------------------------------------

STATE.md

Updated

loop-run-log.md

Updated

------------------------------------------------------------------------------
JSON RECORD
------------------------------------------------------------------------------

```json
{
  "run_id": "2026-07-31T17:30:00+07:00",
  "iteration": 12,
  "phase": "FIX",
  "task": "Improve Hand Tracking FPS",
  "files_changed": 2,
  "tests": {
    "total": 128,
    "passed": 126,
    "failed": 2,
    "coverage": 86
  },
  "performance": {
    "fps": 26
  },
  "outcome": "partial-success",
  "next_phase": "FIX"
}
```

==============================================================================
HISTORY
==============================================================================

Append newer runs below.

Archive entries older than 30 days.

## 2026-08-01T18:10:00+07:00 - T-049 implementation: va chạm AABB + highlight (Layer 2 opens)

- New js/lab-collide.js (3 files: module + tests/lab-collide.spec.js +
  lab.html script include after lab-scene.js; lab-scene.js UNTOUCHED).
- aabbOverlap(a, b, tolerance): pure AABB test, tolerance extends all 4
  sides (default 10px — hand operations tolerate slop).
- CollideTracker decorates the scene's drag lifecycle by wrapping
  _onPointerDown/_onPointerMove/_endDrag instance methods: drag start
  (incl. takeover-spawned copies from cabinet/shelf) tracks the node;
  every move recomputes the hovered matchable node — largest overlap wins
  among candidates (scene.getNodes() minus dragged minus cabinet/shelf,
  minus invisible/non-pickable, optional matches(dragged, node) filter) —
  and highlights it with a bright ring (inline boxShadow
  0 0 0 3px rgba(255,196,60,0.95)) + .lab-collide-target class; moving
  away clears; ALL end paths (pointerup/pointercancel/blur/interrupt/
  clear) clear through the single _endDrag wrap.
- Auto-inits on DOMContentLoaded after lab-scene → window.labCollide.
- Verified: harness 13/13 + lab-scene 29/29 + lab-collide 6/6 = 48/48
  (aabb math + tolerance, hover on/off, strips never targets, matches
  filter, drop/interrupt clear, auto-init wiring). Playwright smoke:
  tracker wired on the mounted scene; drag beaker over tube → tube gets
  the ring + tracked=tube; move away → cleared; 0 console errors;
  screenshot /tmp/opencode/collide.png.
- Debug note (no code change): snap threshold is center-distance on the
  DRAGGED node's own size — beaker at (280,80) snaps to the tube slot
  (d≈59.5 < 60) but (280,100) correctly does not (d≈68.8); diag confirmed
  snap keeps working with the tracker loaded.
- T-049 completed — LAYER 2 OPEN. Next: T-050 pour coupling (ống → bình).

## 2026-08-01T17:50:00+07:00 - T-048 implementation: snap + scale + reset bench (Layer 1 complete)

- js/lab-scene.js: live magnet snap — in the drag move path, after clamping,
  _nearestSnap(node, nx, ny) finds a seed slot within 60px (center-based on
  the dragged node's own size, so any item scale/size snaps correctly) and
  locks the item to the slot top-left; pulling beyond the threshold
  detaches naturally (snap only while within range).
- seedSample now records _seedItems/_seedOrigin and registers the seed
  positions as default snap slots (opts.snapSlots override; setSnapSlots()).
- resetBench(): interruptAll → seeds back to _seedOrigin → removes spawned
  copies (cabinet/shelf tools + reagent bottles), keeps cabinet/shelf and
  snap slots.
- _fitStrips(): on window resize (wired once in _containerRect) cabinet and
  shelf re-fit height and the shelf tracks the right edge — responsive
  layout; drag bounds already re-invalidate on resize.
- lab.html: #lab-resetBench button (top-center of the viewport, z 100001,
  outside #lab-bench so hand clicks keep the click path), wired in
  lab-scene.js init to window.labScene.resetBench().
- Verified: harness 13/13 + lab-scene 29/29 = 42/42 (snap slots registered,
  magnetize to slot (336,60), detach (480,280), center-based size-agnostic
  snap, reset restores seeds + removes copies + keeps strips, resize
  re-fits strips); Playwright smoke: drag beaker → snap (336,60) → pull
  away → detach (480,280) → spawn bottle → click Reset bàn → beaker home
  (80,60), bottle removed, tube untouched, 0 console errors; screenshot
  /tmp/opencode/reset.png. Note: shelf chip press must use bench coords of
  the real viewport width (1020 → chip at x 954..1010), not the 800-wide
  test bench.
- T-048 completed — LAYER 1 COMPLETE. Next: T-049 AABB collision
  (js/lab-collide.js, Layer 2 opens).

## 2026-08-01T17:10:00+07:00 - T-047 implementation: kệ hóa chất (chemical shelf)

- js/lab-scene.js: REAGENT_ITEMS registry — 9 reagents (H2O, HCl, NaOH,
  CuSO4, NaHCO3, CH3COOH, C20H14O4 phenolphtalein, FeCl3, KMnO4), each with
  a real solution color (CuSO4 blue, FeCl3 yellow-brown, KMnO4 purple;
  colorless ones get distinct pale tones) + tên Việt.
- spawnShelf(): right-edge strip (x = benchW − 72, pickable:false container,
  z-index 100000, borderLeft) mirroring the cabinet; 9 chips tinted with
  their liquid color, tooltip "Tên — Công thức" via new opts.title support
  in spawnNode (title attribute, alongside role/aria-label).
- Press on a chip → 64x96 bottle copy spawned at press point (clamped into
  bench), liquid = linear-gradient(180deg, transparent 16%, <color> 16%),
  glass border + rounded bottle; copies carry .formula for Layer 2/3; drag
  taken over immediately (same press→spawn takeover as T-046); auto-init
  calls spawnCabinet() + spawnShelf().
- Verified: harness 13/13 + lab-scene 24/24 = 37/37 (shelf at right edge,
  strip non-pickable/chips pickable, chip hit trail root→shelf→chip,
  spawn+takeover drag exact (568,252), clamp (718,0), multi-bottle
  independence, cabinet+shelf coexist, tooltips). Playwright smoke: real
  mouse hit-testing is blocked by the lab-start overlay (z above bench), so
  events were dispatched like hand-bridge does (PointerEvent on bench +
  window, viewport coords) — press CuSO4 chip → bottle (951,180) → dragged
  (791,260) exact, gradient rgba(47,111,176,0.65), title "Đồng(II) sunfat
  — CuSO4", chip unmoved, seed tube untouched (336,60), 0 console errors;
  screenshot /tmp/opencode/shelf.png.
- T-047 completed. Next: T-048 snap/scale/reset bench (Layer 1 complete).

## 2026-08-01T16:10:00+07:00 - T-046 implementation: cabinet tủ dụng cụ (Layer 1)

- js/lab-scene.js: press→spawn takeover — onStart(node, event, point) can
  return { node: target }; the pointer then drags the new node, so pinching
  a tool chip spawns a copy under the finger and pulls it out in one
  gesture (chip itself never moves). point = press position in bench frame.
- spawnCabinet(): left strip — pickable:false container (PhET rule 9,
  strip never swallows bench hits; tool chips pickable), z-index 100000
  (bench items slide under; chips always reachable), 6 chips (Cốc, Bình
  tam giác, Ống nghiệm, Phễu, Đũa thủy tinh, Bếp đun) with GLASSWARE_STYLES
  registry (funnel/stir/burner visuals added); spawn clamped into bench
  bounds; copies draggable; auto-init spawns the cabinet.
- Bug fixed: spawnNode applied opts.style BEFORE root.addChild, so the
  z-order counter overwrote the cabinet's explicit zIndex 100000; styles
  now apply after addChild so explicit zIndex wins.
- Seed items repositioned x 80+ (right of the strip) — seed keeps 3 items.
- Verified: harness 13/13 + lab-scene 19/19 = 32/32 (cabinet container
  pickable/pruning, chip hit trail root→cabinet→tool, spawn+takeover drag
  exact, multi-copy independence, onStart-without-takeover regression);
  Playwright smoke: press ống nghiệm chip → copy clamped (3,96) → dragged
  (223,156), seed tube untouched at (336,60), 0 console errors; screenshot
  /tmp/opencode/cabinet.png.
- T-046 completed. Next: T-047 chemical shelf (kệ hóa chất).

## 2026-08-01T15:30:00+07:00 - T-045 implementation: LabScene scene graph (Layer 1)

- New js/lab-scene.js: LabScene + LabNode DOM-only scene graph per
  docs/PHET-SCENERY-PATTERNS.md (no new dependencies).
- Patterns applied: model-not-CSS (x/y/scale data, transform as projection);
  hit-test = Picker.recursiveHitTest order (invisible prunes subtree,
  non-pickable skips self only, bounds reject, children topmost-first,
  self last, trail root→leaf); drag = press (grab offset in node-local
  frame, bringToFront, one pointer per drag) → move (pointer − grabOffset,
  clamp in model space to bench bounds before writing, zero-delta skip) →
  release/interrupt (pointerup clean; pointercancel/blur interrupted=true;
  mouseup stop path from hand-bridge endAnyDrag). Listeners on the bench
  container (pointerdown lands there from hand-bridge) + window (moves/ups).
- lab.html: #lab-bench added (absolute inset 0, z-index 2, same rect as the
  canvas → mapToScreen/AR coords unchanged); HANDSCOPE_TARGET_SELECTOR
  '#lab-canvas' → '#lab-bench' (pinch over bench/its children now takes the
  drag path instead of the click path); script include; auto-mount + seed 3
  sample glassware (Cốc, Bình tam giác, Ống nghiệm).
- Bug fixed by tests: LabNode.localToGlobal composed the chain root-first;
  CSS transform order requires deepest-first (scale-then-translate).
- Verified: lab-scene.spec.js 15/15 + harness 13/13 = 28/28; Playwright
  headless drag simulation moved node exactly +120/+80 with 0 console
  errors; hand-bridge.js/gaze/lab.js untouched.
- T-045 completed. Next: T-046 cabinet (spawn glassware copies).

## 2026-08-01T11:20:00+07:00 - T-041 production deployment (Render)

- Docker image pushed to Docker Hub and deployed to Render free tier:
  https://wchem.onrender.com/ — single Express server (static WChem app +
  /api) with MongoDB Atlas (network access 0.0.0.0/0).
- Verified live: /, /lab.html, /js/landing.js, /backend/chemlab-client.js all
  200; /api/health {"status":"ok"}; POST /api/auth/register 201 with JWT.
- First cold requests returned 404 (Render free-tier wake-up); warm requests
  ~0.2-1.5s per asset. UptimeRobot keeps the instance warm.
- UptimeRobot: free plan denies monitor creation via API (getAccountDetails
  ok; newMonitor access_denied). Monitor "wchem" created in dashboard
  (id 803638104, status UP). /api/health monitor optional follow-up.
- T-041 completed.

## 2026-08-01T10:50:00+07:00 - T-040 Docker deployment packaging

- Added Dockerfile (node:22-alpine), .dockerignore, docker-compose.yml
  (mongo:7 + app on :8000, MONGODB_URI + JWT_SECRET env) so the single
  Express server (static app + API) can deploy to any container host
  (Render/Railway/Fly/VPS) without provider CLIs.
- Dockerfile installs backend deps standalone (npm workspaces lockfile does
  not round-trip into the image: --workspace flag and npm ci both failed;
  root-level hoist installed nothing usable).
- Verified: image builds; compose stack boots; container smoke test passed —
  /, /lab.html, /js/landing.js, /backend/chemlab-client.js (200), /api/health
  ok, register → JWT → /api/compounds (200, auth-gated) all green.
- Local note: host port 27017 was in use, so mongo is only on the compose
  network (not published).
- Next: push image to a registry and deploy; needs MongoDB Atlas URI +
  JWT_SECRET + host account (Render/Railway/etc.) + UptimeRobot API key.

## 2026-08-01T10:30:00+07:00 - T-039 primary HTML app migrated to own backend

- Replaced the InsForge backend dependency in the primary Wchem HTML app with
  the project's own Express + MongoDB backend, per loop/PROMPT.md ("Do NOT use
  insforge or any external BaaS platform") and user direction.
- New `backend/chemlab-client.js`: dependency-free ES module using fetch +
  JWT in localStorage; API surface kept compatible with landing.js
  (signIn/signUp/signOut/me/getCompounds/getHealth/isAuthenticated/
  getCurrentUserId). Registration derives a name from the email when none is
  provided (backend requires name >= 2 chars).
- `js/landing.js`: all insforgeClient references → chemlabClient; removed
  loadElementsFromBackend (Express compounds have no symbol/color fields);
  backend-test modal re-pointed to /api/health, /api/compounds, /api/auth/me;
  InsForge-only steps (profile, create experiment, award XP, achievements,
  leaderboard) dropped since the backend does not have those endpoints.
- `index.html`: client import swapped; branding updated (feature tags,
  footer "Powered by ChemLab API", backend-test modal title/sub); modal
  buttons trimmed to Full Check / API Health / Compounds / Auth (Me).
- `taskflow/backend/src/app.js`: serves the Wchem static app via
  express.static (STATIC_DIR env or project root, dotfiles denied) in
  addition to /api routes; API routes registered before static.
- `start-server.sh`: boots Express + MongoDB on :8000 instead of python
  http.server.
- Root `package.json`: removed @insforge/sdk dependency; deleted
  `backend/insforge-client.js` (approved).
- Verification: `node --check js/landing.js`; client module import in Node;
  root harness 13/13; taskflow backend 26/26 (static middleware does not
  affect Jest); full smoke test against MongoMemoryServer — PASS for /,
  /lab.html, /js/landing.js, /backend/chemlab-client.js, /api/health, and a
  register → me → create compound → list compounds round-trip.
- Note: MongoDB (mongod) is not installed on this machine; local run needs it
  (or MONGODB_URI). T-039 completed. Next: deployment of the single Express
  server.

## 2026-08-01T09:50:00+07:00 - T-038 ChemLab critical-flow E2E

- Added Playwright Chromium browser automation and `npm run test:e2e` at the
  `taskflow/` workspace level. Chromium was installed locally by Playwright.
- Added one deterministic critical journey: register a user, search PubChem
  for Aspirin, resolve its CID/formula, render its 3D structure, and save it
  into the compound library. PubChem, 3Dmol, and Socket.io are intercepted at
  the browser boundary; registration and compound-library API responses are
  isolated for a self-contained frontend E2E test.
- Root cause during initial execution: resolving a molecule already opens the
  save dialog. The test attempted to open it twice. Removed the redundant
  action; no application behavior changed.
- Verification passed: `npm run test:e2e` (1/1), backend `npm test` (26/26,
  statements 88.29%, branches 83.62%, functions 92%, lines 89.44%), frontend
  `npm test` (61/61, coverage thresholds met), frontend typecheck and lint,
  backend lint, and frontend production build (88 modules, 267.59 kB JS,
  47.99 kB CSS).
- T-038 completed. Next task: deploy ChemLab using the existing Vercel and
  Node/Mongo deployment instructions in `taskflow/README.md`.

## 2026-07-31T18:30:00+07:00 - T-013 gesture smoothing and menu click detection

- Identified that `detectLoop` sent predicted landmarks back through
  `processFrame` while MediaPipe inference was in flight. This recursively
  updated the temporal filter and last-known landmarks, causing cumulative
  interpolation drift.
- Removed that feedback path; prediction remains limited to the explicit hand
  loss grace period.
- Increased the default pinch entry ratio from `0.14` to `0.16` while keeping
  the existing `0.26` exit ratio, making menu clicks more tolerant without
  removing hysteresis.
- Changed source files: `js/hand-bridge.js`.
- Verification pending: the documented `gesture_tracking.spec.ts` and
  `menu_click.spec.ts`, along with an executable project test harness, are not
  present in this workspace.
- Passed validation: `node --check js/hand-bridge.js`, `node --check js/lab.js`,
  `./test-backend-db.sh` (all database checks and RLS policy checks), and
  `npx @cobusgreyling/loop-audit .` (100/100, L3).

## 2026-07-31T18:40:00+07:00 - T-013 test-harness recovery attempt

- Searched the workspace for `gesture_tracking.spec.ts`, `menu_click.spec.ts`,
  and their identifiers. They are not present; only historical references in
  loop documentation remain.
- Ran `npm test`: it fails before test execution because `package.json` has no
  `test` script.
- Did not create substitute tests or declare an unverified pass. T-013 remains
  in TEST pending restoration of the original frontend test harness.
- Added `loop/PROMPT.md` to the mandatory startup sequence in `AGENTS.md`,
  `LOOP.md`, and `loop-constraints.md`.

## 2026-07-31T18:50:00+07:00 - T-013 harness restored and tests pass

- Added dependency-free `test` script to `package.json`.
- Created `tests/gesture_tracking.spec.js` executing `js/hand-bridge.js` in a
  controlled browser-like VM to test smoothing and menu-click dispatch.
- `npm test` passes 2/2 targeted tests.
- `node --check js/hand-bridge.js` and `node --check js/lab.js` pass.
- `./test-backend-db.sh` passes all database and RLS policy checks.
- `npx @cobusgreyling/loop-audit .` remains 100/100, L3.
- No FPS regression: FPS remains 26 per last measurement; no rendering
  modifications introduced in this iteration.
- Task T-013 completed. Next: T-014 (continue FPS improvement beyond 26).

## 2026-07-31T18:55:00+07:00 - T3 Code control surface connected

- Installed/launched T3 Code (github.com/pingdotgg/t3code) via `npx t3@latest serve`.
- Verified provider prerequisites: OpenCode 1.18.10 installed and authenticated; Node 22.23.1 (>= 22.16).
- Server running headless at http://127.0.0.1:3773 with Wchem auto-bootstrapped as a project (`--auto-bootstrap-project-from-cwd`).
- Pairing URL: http://127.0.0.1:3773/pair#token=NZDMX5BLXQCD
- Server log: `.t3code/server.log` (process detached via setsid; survives session end).
- The loop's OpenCode sessions are now controllable from the T3 Code web/mobile/desktop surface.
- Rebound server to `0.0.0.0:3773` for Android/LAN access.
- LAN connection string: http://192.168.1.17:3773
- LAN pairing URL: http://192.168.1.17:3773/pair#token=VGLG5VRWALSC
- Remote access via Tailscale configured. Tailnet: pc-admin (100.76.72.25), tailnet name `pc-admin.tail6d9e2f.ts.net`.
- Tailscale Serve (root-managed): `sudo tailscale serve --https=443 http://127.0.0.1:3773` — verified HTTP 200 over HTTPS.
- Final remote HTTPS pairing URL: https://pc-admin.tail6d9e2f.ts.net/pair#token=CLU58YPX2K5T
- Phone `oneplus-ace-3v-1` already on the tailnet (Android Tailscale app).
- Note: server still advertises LAN URL in logs (user-level process cannot query root serve config); HTTPS tailnet URL works identically.

## 2026-07-31T21:15:00+07:00 - T-014 FPS improvement: deduplicate primary hand analysis

- Found `processFrame` computing `analyzeHand` + `resolvePinch` twice per frame
  for the primary hand: once in the per-hand loop, once for the gesture name.
  The duplicate `resolvePinch` also pushed a second `span2DHistory` entry per
  frame, lagging the average span used for pinch ratio.
- Reordered the loop to find the primary hand first and reuse its analysis for
  the status/gesture computation. Net effect: one fewer landmark analysis and
  one fewer pinch state mutation per frame; pinch history now samples once per
  frame.
- Added regression test: `processFrame samples pinch state exactly once per
  frame per hand` (verifies `span2DHistory.length === 1` after one frame).
- `npm test` passes 3/3; `node --check` passes for source and tests.
- T3 Code server unaffected (HTTP 200 on 127.0.0.1:3773).
- No FPS measurement regression introduced; expected FPS >= 26 (savings are
  per-frame CPU reduction, measurement pending live browser run).

## 2026-07-31T21:25:00+07:00 - T-015 FPS improvement: cache game canvas lookup

- `getGameCanvas()` ran `document.querySelector(selector)` up to 4 times per
  frame (mapToScreen + handleInteraction, per hand). DOM lookups are pure
  waste when the canvas is stable.
- Cached the queried element keyed by selector; re-query only when the
  selector changes or the cached element is detached (`isConnected === false`).
- Added regression test: canvas `querySelector` runs exactly once across two
  processed frames.
- `npm test` passes 4/4; `node --check` passes for source and tests.
- T3 Code server unaffected. Expected FPS >= 26 (per-frame DOM lookup
  savings; live browser measurement pending).

## 2026-07-31T21:31:00+07:00 - T-016 FPS improvement: throttle status event emission

- `processFrame` dispatched a `HandStatus` CustomEvent every frame even when
  nothing changed (same hand detected, same gesture, same source) — wasted
  event churn on every frame.
- `emitStatus` now computes a signature (`handDetected|gesture|source`) and
  deduplicates: identical signatures dispatch at most once per
  `STATUS_HEARTBEAT_FRAMES` (5) frames; a changed signature dispatches
  immediately.
- First regression test attempt used frame-level pinch→open transitions, but
  the OneEuro finger smoothing legitimately keeps a released pinch shape for
  several frames (release hysteresis), so the open-hand frame never produced a
  signature change. Rewrote the test to drive `emitStatus` directly, which
  verifies the throttle contract without depending on filter dynamics.
- Added regression test: identical status does not re-dispatch every frame,
  gesture change dispatches immediately.
- `npm test` passes 5/5; `node --check` passes for source and tests.
- T3 Code server unaffected (HTTP 200 on 127.0.0.1:3773).
- No FPS measurement regression introduced; expected FPS >= 26 (per-frame
  event/serialization savings; live browser measurement pending).

## 2026-07-31T21:33:00+07:00 - T-017 FPS improvement: cache game canvas bounding rect

- `mapToScreen` called `gameCanvas.getBoundingClientRect()` on every frame per
  hand (up to 2 layout reads/frame). It is a layout read that can force a
  synchronous reflow when the frame has written styles earlier.
- The canvas lives in a `position: fixed; overflow: hidden` viewport
  (`#lab-viewport` / `#kl-viewport`), so its viewport-relative rect is stable
  except on window resize; invalidation also covers host-page scroll as a
  safety net (passive listener, zero layout cost).
- `getGameCanvasRect` caches the rect keyed on the cached canvas element
  (identity compare re-fetches only when the element is replaced).
- Added regression test: `getBoundingClientRect` runs exactly once across two
  processed frames.
- `npm test` passes 6/6; `node --check` passes for source and tests.
- T3 Code server unaffected (HTTP 200 on 127.0.0.1:3773).
- No FPS measurement regression introduced; expected FPS >= 26 (per-frame
  layout-read savings; live browser measurement pending).

## 2026-07-31T21:35:00+07:00 - Removed backend DB test script

- Deleted `test-backend-db.sh` (user-approved; no longer needed now that the
  frontend harness is the loop's verification path).
- Cleaned references in STRUCTURE.md (structure tree + quick commands) and
  project-context.md (commands list).
- Kept `backend/insforge-backend-test.js` and the lab Backend tab (live UI
  feature), and `backend/server.py` (runtime WebSocket tracker, not a test).
- Historical log entries referencing the script remain as records.

## 2026-07-31T21:38:00+07:00 - T-018 FPS improvement: skip redundant status text writes + removed lab Backend tab

- `gestureEl.textContent` / `handInfoEl.textContent` were assigned every frame
  with a valid hand even when the value never changed; each assignment
  replaces the text node and invalidates its style.
- Added `setTextOnce(el, text)` — writes only when the value differs — and
  applied it to every tracking-path text write (valid, predicted, and backend
  landmark paths, plus the hand-lost and stop resets).
- Added regression test: identical gesture text is written exactly once across
  two processed frames.
- User requested the Backend test panel removed from the lab UI: removed the
  Backend tab button and `#lab-backend-panel` from lab.html, stripped the
  `initBackendTest` wiring from lab.js, and deleted the now-orphaned
  `backend/insforge-backend-test.js` (no page loaded it).
- Kept `backend/server.py` and the WebSocket backend client in hand-bridge.js
  (runtime tracker, not a test).
- `npm test` passes 7/7; `node --check` passes for source and tests.
- No FPS measurement regression introduced; expected FPS >= 26 (per-frame DOM
  write savings; live browser measurement pending).

## 2026-07-31T21:41:00+07:00 - T-019 FPS improvement: trim dead per-frame math in analyzeHand

- Audit of `analyzeHand` consumers showed only `pinch2D`, `span2D`,
  `extendedCount`, and `pinchFingers` are ever read; `handSpan` and `pinchDist`
  (3D) were computed every frame per hand and never consumed.
- Removed the dead 3D fields (4 fewer Math.hypot calls per hand per frame) and
  replaced `Object.values(extended).filter(Boolean).length` with a plain
  counter (2 fewer array allocations per hand per frame).
- Added regression test: `analyzeHand` omits the 3D fields while
  `extendedCount`/`pinchFingers`/2D distances stay correct.
- `npm test` passes 8/8; `node --check` passes for source and tests.
- No FPS measurement regression introduced; expected FPS >= 26 (live browser
  measurement pending).

## 2026-07-31T21:43:00+07:00 - T-020 FPS improvement: reuse cached canvas rect in AR overlay

- `drawArOverlay` called `kl-arCanvas.getBoundingClientRect()` every frame
  with a valid hand — a second per-frame layout read on top of mapToScreen's.
- The T-017 rect cache is keyed per canvas element, so the AR canvas reuses it
  with the same resize/scroll invalidation; renamed the helper to
  `getCachedCanvasRect` (internal only).
- No rendering change: the same rect values drive the same skeleton drawing.
- Added regression test: the rect cache is shared and keyed per element
  (second read for the same canvas hits the cache).
- `npm test` passes 9/9; `node --check` passes for source and tests.
- No FPS measurement regression introduced; expected FPS >= 26 (live browser
  measurement pending).

## 2026-07-31T21:45:00+07:00 - T-021 FPS improvement: remove per-frame allocations in validateLandmarks

- `validateLandmarks` allocated two arrays per hand per frame: the
  `lm.filter(...)` in-frame result and the `[4,8,0,9].filter(...)` key-point
  result (the key-points literal itself is also re-created per call).
- Replaced both with counting loops and unrolled key-point bounds checks —
  identical accept/reject behavior, zero allocations.
- Added regression test: valid pinch/open hands pass; collapsed and off-frame
  hands still rejected.
- `npm test` passes 10/10; `node --check` passes for source and tests.
- No FPS measurement regression introduced; expected FPS >= 26 (live browser
  measurement pending).

## 2026-07-31T21:47:00+07:00 - T-022 FPS improvement: remove per-frame allocations in detectPinchFingers

- `detectPinchFingers` built a 4-entry fingers table (4 object literals per
  call) and then filter()/map() result arrays — per hand per frame.
- Replaced with four direct threshold checks that push only matching keys;
  result shape unchanged.
- First test attempt used `assert.deepEqual` against the returned array, which
  fails on cross-realm arrays (the harness runs hand-bridge.js in a vm
  context, so the array has a different prototype). Rewrote the assertion to
  compare length + element primitives.
- Added regression test: pinch hand detects exactly ['index'], open hand
  detects none.
- `npm test` passes 11/11; `node --check` passes for source and tests.
- No FPS measurement regression introduced; expected FPS >= 26 (live browser
  measurement pending).

## 2026-07-31T21:51:00+07:00 - T-023 FPS improvement: remove per-frame validHands.map + fix rect cache thrash

- `processFrame` allocated `allLandmarks = validHands.map(v => v.landmarks)`
  every frame only to feed the draw helpers.
- `drawArOverlay` now consumes the `validHands` wrappers directly (or a single
  `{ landmarks }` wrapper on the prediction/backend paths) — no intermediate
  array on the hot path; skeleton rendering unchanged (same order, same
  colors, same strokes).
- Regression test exposed a real defect in T-020: the single-slot rect cache
  thrashed because mapToScreen (game canvas) and drawArOverlay (kl-arCanvas)
  alternate every frame, so each canvas re-read its rect every frame. The
  cache is now a per-element Map (cleared on resize/scroll) — one rect read
  per canvas per layout change.
- Added regression tests: AR overlay draws 21 strokes per hand across two
  hands; existing rect-cache test now guards the two-canvas case.
- `npm test` passes 12/12; `node --check` passes for source and tests.
- No FPS measurement regression introduced; expected FPS >= 26 (live browser
  measurement pending).

## 2026-07-31T21:53:00+07:00 - T-024 FPS improvement: batch AR skeleton canvas ops

- `drawHandSkeleton` issued 42 individual canvas path operations per hand per
  frame: 21 connection strokes and 21 dot fills, each with its own
  beginPath/stroke (or fill), plus a per-dot fillStyle assignment.
- All elements share a single color per hand, so the connections now batch
  into one beginPath → moveTo/lineTo × 21 → single stroke, and the dots into
  one beginPath → moveTo+arc × 21 → single fill (moveTo before each arc keeps
  subpaths disconnected). Identical pixels, 42 path batches → 2 per hand.
- Updated regression test: per hand, exactly one stroke and one fill are
  issued across the two-hand frame.
- `npm test` passes 12/12; `node --check` passes for source and tests.
- No FPS measurement regression introduced; expected FPS >= 26 (live browser
  measurement pending).

## 2026-07-31T22:20:00+07:00 - FPS series closed; user confirmed

- User verified T-029 live: "oh right it nice" — hand-visible FPS ~22-24
  with both trackers active, no perceived tracking regression.
- FPS series T-013..T-029 final result (measured, not estimated):
  - 18 (original) -> 12 (pre-series with both trackers) -> ~24 (both active)
  - Gaze only: 15-20 -> ~25
  - Idle: 23-24 -> 28-29
- Remaining option if more headroom is wanted: Python backend tracker
  (backend/server.py, WebSocket :8765) moves inference off the main thread
  for 60 FPS + full-rate tracking; not started.

## 2026-07-31T22:15:00+07:00 - T-029 Alternate hand inference + app-FPS readout

- User's post-T-027/028 live numbers: 14-15 (hand visible), 24-25 (gaze
  only), 28-29 (idle) — confirms both throttles landed.
- Remaining bottleneck: hand model ~28 ms/inference at full rate.
- handFrameSkip now alternates detection every other rAF tick while a hand
  is present (~12 Hz sample; OneEuro smoothing covers it; skipped ticks
  re-process previous landmarks so pointer motion keeps tick rate).
- FPS readout semantics fixed: now measures app tick rate (prevTickAt)
  instead of model run rate — consistent with DevTools-style meters.
  Under the old semantics the readout showed the poll rate (~10) while
  idle, which was misleading.
- Tradeoff documented: worst-case pinch transition latency +~85 ms.
- 13/13 tests pass.

## 2026-07-31T22:10:00+07:00 - T-028 Idle-throttle the hand model

- While no hand is in view the hand model still ran a full inference every
  rAF (~25 ms/frame of wasted CPU).
- detectLoop now keeps full rate during the HAND_LOST_GRACE_MS (500 ms)
  window so re-acquisition after a brief loss is instant, then polls at
  ~10 Hz (IDLE_DETECT_GAP_MS 100) via lastHandSeenAt/lastIdleDetectAt.
  First detection after a hand reappears: <=100 ms + inference time.
- Note: the FPS readout shows the model run rate, so it reads ~10 while no
  hand is in view — the app is smoother, the number is the poll rate.
- 13/13 tests pass; hot path untouched (benchmark noise only).

## 2026-07-31T22:05:00+07:00 - T-027 Throttle gaze inference to ~15 Hz

- User's live readings with the new readout: 12 FPS (gaze + hand), 15-20
  (hand only), 23-24 (neither — sim-alone ceiling).
- Root cause: gaze.js + hand-bridge.js each run a full MediaPipe model
  every rAF; plus the OpenCV pupil detector and the WebGL sim on the same
  main thread.
- Fix: MIN_GAZE_GAP_MS 66 in gaze.js detectFrame — face inference at most
  ~15/s. Gaze output is smoothed (0.18 lerp) so pointing quality holds;
  calibration capture now takes ~1.2 s/point (18 frames at 15 Hz).
  Pupil detector inherits the throttle (runs per face frame). Hand model
  untouched — full rate preserved.
- 13/13 tests pass; benchmark unchanged (hand path untouched).
- Pending user confirmation: FPS with both active should now be ~20+.

## 2026-07-31T21:58:00+07:00 - T-026 Visible FPS readout in status bar

- The FPS figure previously existed only inside fpsSmooth + the
  handscope:status event, so nothing showed it on screen.
- Added #hb-fps span to the overlay status bar (first slot), written via
  setTextOnce each model run with the rounded fpsSmooth value — the rounded
  number changes rarely, so the text write stays throttled.
- Styled #hb-fps in css/hand-bridge.css (teal, matches gs-ok).
- Harness now records getElementById requests; new regression test asserts
  the bridge wires the hb-fps element. 13/13 tests pass, benchmark unchanged
  (~144 µs/frame).
- To see FPS live: open lab.html with a camera — bottom-right status bar
  shows the number while tracking runs.

## 2026-07-31T21:55:00+07:00 - T-025 Finalize: benchmark harness, cleanup, full verification

- Extracted the shared browser-like VM harness into tests/harness.js (spec.js
  now requires it; tests still 12/12).
- Added tests/benchmark.js + `npm run benchmark`: processFrame hot path with
  2 hands + AR overlay measures ~145 µs/frame (~6800 frames/s equivalent) —
  the JS tracking loop is not the FPS bottleneck; MediaPipe inference is.
- Cleaned stale STATE.md HIGH PRIORITY items that referenced non-existent
  gesture_tracking.spec.ts / menu_click.spec.ts files.
- Removed the stale backend-test.html URL line from start-server.sh.
- Full verification sweep: npm test 12/12, node --check on all JS files,
  no dead backend-test references, loop audit 100/100 L3, T3 Code server
  HTTP 200.
- FPS improvement series T-013..T-025 closed out; only the live browser FPS
  measurement remains, pending a camera session.

## 2026-07-31T18:00:00+07:00 — Loop configuration audit

Audited and repaired the full Loop configuration before autonomous run.

- Removed Sandboxels references (STATE.md, loop-constraints.md, loop-constraints skill).
- Replaced with generic chemistry simulation engine rules (AGENTS.md, constraints).
- Synced STATE.md to real state (T-013, FIX, iteration 12).
- Harmonized token policy tiers (60/80/95) across budget, constraints, budget skill.
- Fixed outdated paths (opencode.json verifier -> loop-constraints.md; run log src/* -> js/*).
- Fixed failed-test count inconsistency (3 -> 2 documented).
- Created project-context.md, decision-log.md, loop-ledger.json.
- Added safety gates + human escalation path to LOOP.md.
- Result: loop-audit 100/100, Level L3.

Files changed: 10 (Loop configuration and docs only, no source code).

## 2026-07-31 — T-030 ChemLab pivot (taskflow web app)

User corrected the product direction: the web app is a VIRTUAL CHEMISTRY
LAB, to be built with free open-source tooling and not coded from zero.

Repaired the npm audit fix --force breakage first:
- backend/package.json had eslint ^10.8.0, jest ^25, and injected vite 8.2.0 /
  vitest 4.1.10 / @vitest/coverage-v8 4.1.10 (jest collected 0 tests, coverage
  0%); frontend had eslint ^10.8.0 / vite ^8.2.0 / vitest ^4.1.10.
- Restored known-good pins: eslint ^9.18.0, vite ^5.4.11, vitest ^2.1.8,
  @vitest/coverage-v8 ^2.1.8, @vitejs/plugin-react ^4.3.4, jest ^29.7.0.
- Clean reinstall (rm node_modules + lockfiles). Backend 26/26, frontend
  7/7 again.

ChemLab pivot (reuse the proven TaskFlow scaffold — auth/JWT, Mongoose,
Socket.io, React+Vite, design system):
- Backend: models/Compound.js + routes/compound.routes.js (owner-scoped CRUD,
  paginated, validated) replace Task; socket events renamed to
  compound:created/updated/deleted; seed.js seeds Water/Caffeine/Aspirin/
  NaCl; tests/compound.test.js (17 tests). Dead validateTaskInput removed
  (coverage was under threshold with dead code present).
- Frontend: lib/elements.ts (118 elements, category color classes);
  PeriodicTable (9-col grid, click-to-select); MoleculeSearch (PubChem
  autocomplete + resolve via PUG REST — free, no API key); MoleculeViewer
  (3Dmol.js CDN, loads 3D SDF from PubChem by CID, stick+sphere style);
  CompoundForm/Card/List, LabStats; LabPage at /lab (periodic table +
  explorer + saved compounds, realtime); branding ChemLab; auth pages copy
  updated; Spinner gained a size prop; dup pubchemSearchByName shadowing
  removed from MoleculeSearch.
- Tests: 10 frontend suites, 42 tests (api + PubChem helpers, PeriodicTable,
  MoleculeSearch, MoleculeViewer with $3Dmol stubs, CompoundForm/Card/List,
  LabStats, LabPage integration).

Verification: backend 26/26 (coverage thresholds met), frontend 42/42
(thresholds enforced), tsc + eslint clean, `npm run build` succeeds
(83 modules, 241 kB JS / 37 kB CSS).

Docs: STATE.md updated (T-030 done, iteration 31), taskflow/README.md created.

## 2026-08-01 - Element detail popover (T-031)

- Added `group`, `period`, `block`, `phase`, `electron` fields to the `Element` interface and all 118 elements in `lib/elements.ts`.
- Added `blockClass()` and `phaseLabel()` helpers in `lib/elements.ts`.
- Created `ElementPopover.tsx` — a fixed-position popover showing element name, atomic number, mass, category, group, period, block, phase, and electron config; closes on Escape or click-away.
- Updated `PeriodicTable.tsx` to wire popover on click (and keyboard Enter/Space), using a ref map to get the cell's DOM rect for positioning.
- Tests: 42/42 frontend (10 suites), 26/26 backend; tsc + eslint clean; `npm run build` succeeds.

## 2026-08-01 - Lab glassware + compound state of matter (T-032)

- Created `LabGlassware.tsx` — SVG lab bench with beaker, test tube, graduated cylinder; each renders the loaded compound's room-temperature phase (liquid fill / solid powder / gas bubbles). Includes `compoundPhase()` known-phase table (H2O→liquid, CO2→gas, Fe→solid, NaCl→solid, …) with solid default and formula normalization, plus switchable glassware tabs.
- Updated `MoleculeViewer.tsx` — accepts optional `formula` prop and renders the glassware bench below the 3D canvas.
- Updated `LabPage.tsx` — passes `viewer.formula` to MoleculeViewer.
- Tests: MoleculeViewer suite now 8 tests (compoundPhase mapping, normalization, LabGlassware rendering + tab switching). Frontend 47/47, backend 26/26; tsc + eslint clean; build succeeds.

## 2026-08-01 - ChemLab UI re-themed to primary Wchem look (T-033)

- Re-themed `index.css` design tokens from teal to the primary Wchem palette: Discovery Green primary (#15803D), Science Blue secondary (#3f56BC), Orange accent (#D97706), mint background (#F0FDF4), green foreground/borders; fonts now Exo (headings), Inter (body), Space Grotesk (UI), Roboto Mono (mono).
- Updated `index.html` Google Fonts link to load the new family set.
- Added `.glass-panel` utility (white 55% + blur 20px + soft shadow, dark variant) matching design-tokens.css; applied to the shared `Card` component so all ChemLab cards now use the Kinetic Lab glass look.
- Tests: 47/47 frontend, 26/26 backend; tsc + eslint clean; build succeeds.

## 2026-08-01 - Molecule viewer state-of-matter mode (T-034)

- Created `PhaseView.tsx` — isometric SVG rendering of the compound's room-temperature state: solid metallic block (Fe), liquid droplet (H2O), gas cloud (CO2), with name + phase label; reuses `compoundPhase()`.
- Updated `MoleculeViewer.tsx` — added Structure / State-of-matter tab toggle; viewer effect now re-initializes when switching back to structure mode (fixes container-not-mounted bug); PhaseView replaces the 3D canvas in state mode.
- Tests: MoleculeViewer suite now 12 tests (mode toggle, PhaseView per-phase aria labels). Frontend 51/51, backend 26/26; tsc + eslint clean; build succeeds.

## 2026-08-01 - Periodic table → 3D structure integration (T-035)

- `ElementPopover.tsx` — added "View 3D structure" button (async, with loading state) via new `onView3d` prop.
- `PeriodicTable.tsx` — accepts `onView3d`, forwards it to the popover, and closes the popover before resolving.
- `LabPage.tsx` — `handleElementView3d` resolves the element name via PubChem (`pubchemSearchByName`) and loads its structure into the MoleculeViewer (e.g. Fe → CID 23925, 3D crystal of iron).
- Tests: PeriodicTable suite now 5 tests (popover opens with electron config, View 3D resolves + closes, Escape closes). Frontend 53/53, backend 26/26; tsc + eslint clean; build succeeds.

## 2026-08-01 - FINAL BUILD verification (test phase complete)

- Full sweep across both workspaces:
  - Backend: 26/26 Jest tests, coverage thresholds met (80/75/80/80).
  - Frontend: 53/53 Vitest tests across 10 files, coverage thresholds met (80/70/80/80).
  - `npm run lint` (backend + frontend), `npm run typecheck` (tsc -b) — all clean.
  - Production build succeeds: 86 modules, 262.60 kB JS (80.78 gzip) / 47.04 kB CSS (8.86 gzip).
  - Wchem harness: 13/13.
- ChemLab test phase complete: periodic table + element details, PubChem search, 3D structure viewer, state-of-matter view, lab glassware, compound library, realtime, auth, Wchem-themed UI.

## 2026-08-01 - Reaction lab (T-036)

- Created `lib/reactions.ts` — curated reaction database (neutralization, acid–carbonate, combustion, oxidation, electrolysis) with reactants, products, phase states, balanced equations, and notes; `findReaction()` pair matcher (order/case-insensitive) and `phaseGlyph()`.
- Created `ReactionLab.tsx` — two reactant selects populated from the reaction DB; on a matching pair shows reaction type badge, balanced equation, reactant/product list with phase labels, and a note (e.g. HCl + NaOH → NaCl + H2O).
- Added `ReactionLab` panel to the LabPage under "My compounds".
- Tests: new ReactionLab suite (8 tests). Frontend 61/61 (11 files), backend 26/26; tsc + eslint clean; build succeeds (267.6 kB JS / 48 kB CSS).

## 2026-08-01 - Deployment prep (T-037)

- Added `taskflow/vercel.json` — SPA rewrite for the frontend (Vercel-ready).
- Rewrote `taskflow/README.md` — refreshed feature list (periodic table popover, 3D, state of matter, lab bench, reaction lab), current test counts (61 frontend / 26 backend), and a Deployment section: Vercel frontend settings, backend hosting env vars (PORT, MONGODB_URI, JWT_SECRET, CLIENT_ORIGIN — verified against src/app.js and middleware/auth.js), and WebSocket cross-origin notes.
- Verified: build succeeds, backend 26/26, frontend 61/61.

## 2026-08-01 - CSP fix for served HTML app (T-042)

- Root cause: `taskflow/backend/src/app.js` used `app.use(helmet())` with the default CSP (`script-src 'self'`, `script-src-attr 'none'`), which blocked the WChem HTML app served by Express: inline theme/auth scripts (index.html:6, :382, :399), all inline `onclick` handlers (sign-in modal tabs, đăng ký button, CTA buttons), and the GSAP scripts from cdnjs.cloudflare.com — sign-in dead, đăng ký unclickable, GSAP effects missing.
- Fixed `taskflow/backend/src/app.js` — helmet now configured with a CSP that keeps every other protection (`object-src 'none'`, `frame-ancestors 'self'`, nosniff, etc.) but adds `'unsafe-inline'` to `script-src`/`script-src-attr` and `https://cdnjs.cloudflare.com` to `script-src`.
- Added `taskflow/backend/tests/csp.test.js` — 3 regression tests: inline scripts/handlers allowed, cdnjs allowed, remaining helmet protections intact.
- Verified: live header check (`curl -sI /index.html` shows `script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; script-src-attr 'unsafe-inline'`), backend 29/29 Jest tests, eslint clean. Frontend untouched.

## 2026-08-01 - CSP fix part 2: lab.html camera startup (T-042 cont.)

- User reported camera won't start in lab.html ("Khởi động camera" did nothing).
- Root cause: same helmet CSP regression, extended — the MediaPipe pipeline in
  js/hand-bridge.js (startBrowserTracking) dynamically imports
  `cdn.jsdelivr.net/.../vision_bundle.mjs`, loads wasm filesets from jsdelivr,
  fetches models from `storage.googleapis.com`, instantiates WebAssembly, and
  gaze.js loads opencv.js from `docs.opencv.org` — all blocked by the
  previous CSP (script-src/connect-src fell back to 'self').
- `taskflow/backend/src/app.js` — CSP extended: `script-src` adds
  `'wasm-unsafe-eval'`, `https://cdn.jsdelivr.net`, `https://docs.opencv.org`;
  explicit `connect-src` adds `https://cdn.jsdelivr.net`,
  `https://storage.googleapis.com`, `ws:`, `wss:` (tracking WebSocket).
- `taskflow/backend/tests/csp.test.js` — 4th regression test covering the
  full camera pipeline allowlist.
- Verified: live header check on /lab.html shows all new sources present,
  backend 30/30 Jest tests, eslint clean. Frontend untouched.

## 2026-08-01 - start-server.sh false mongod warning (T-042 minor)

- Warning fired when `mongod` was not in PATH even though MongoDB ran as a
  systemd/docker service on 127.0.0.1:27017 (server connected fine after the
  warning). Root cause: the check tested PATH presence, not reachability.
- `start-server.sh` — probe 127.0.0.1:27017 via bash /dev/tcp; warn only when
  MONGODB_URI is unset AND mongod is not in PATH AND the port is closed.
- Verified: no warning on startup with service-based MongoDB; warning still
  shown for a closed port; `bash -n` clean.

## 2026-08-01 - Atlas MongoDB config (T-042 minor)

- Created `taskflow/backend/.env` (gitignored) with MONGODB_URI pointing at
  the MongoDB Atlas cluster (db: `wchem`) and a JWT_SECRET, per user-provided
  credentials. URI written with `/wchem` — the raw URI had no database name
  and would default to `test`.
- Verified: server boot via dotenv, /api/health OK, register round-trip
  against Atlas succeeded. No credentials stored in any documentation.

## 2026-08-01 - Bigger logout button (ChemLab)

- `taskflow/frontend/src/pages/LabPage.tsx` — Sign out button size changed
  from `sm` (h-8, 32px) to `md` (h-11, 44px, px-5) per user request; also
  meets the 44px minimum touch-target guideline.
- Verified: LabPage tests 6/6, tsc clean, eslint clean.

## 2026-08-01 - Bigger navbar logout button (primary HTML app)

- User clarified they meant the navbar logout button of the primary HTML app
  (the card-nav CTA "Đăng xuất"), not the ChemLab React button.
- `css/card-nav.css` — `.card-nav-cta-button` padding `0 1rem` → `0 1.35rem`,
  font-size `13px` → `14px` (button box visibly larger on desktop; button is
  hidden on mobile by existing media query).
- Note: the earlier LabPage Sign out `sm` → `md` change is kept (44px touch
  target, no regression).

## 2026-08-01 - Theme-aware navbar + avatar + profile page (T-043)

- User requests: (1) navbar switches colors with dark/light mode, (2) after
  login the navbar shows an avatar instead of the "Đăng xuất" text,
  (3) add a profile page.
- `css/card-nav.css` — added `[data-theme="light"]` overrides for the navbar
  bar (white glass bg, dark border/shadow), hamburger lines, logo text, and
  expanded menu cards/links; added `.nav-avatar` circle + `.nav-avatar-btn`
  (transparent CTA) styles.
- `js/landing.js` — when logged in, the navbar CTA becomes an avatar circle
  (initial of email) that navigates to profile.html; logged out restores
  "Sign in" and removes the avatar class; "Quản lý tài khoản" nav item now
  points to profile.html.
- `profile.html` (new) — profile page: avatar, name, email, join date, "Mở
  Phòng Thí Nghiệm" + "Đăng xuất" buttons; uses chemlabClient; redirects to
  index.html when logged out; navbar shows avatar; menu Đăng xuất link signs
  out.
- Verified: landing.js syntax, card-nav.css braces, Wchem harness 13/13,
  profile.html + landing.js served 200.

## 2026-08-01 - Full-stack profile page (ui-ux-pro-max applied) (T-043 cont.)

- User asked to apply the ui-ux-pro-max skill to the profile page.
  Validation searches run: product/ux/icons domains + pro-rules checklist.
- `profile.html` — upgraded: skeleton shimmer while loading (loading-state
  rule); fresh profile via GET /api/auth/me + live compound count via
  GET /api/compounds (full-stack data, not just localStorage); stat cards
  (Hợp chất đã lưu, Hạng thành viên); active nav-link marking on the
  current page; error state with inline message; logout keeps loading
  feedback; reduced-motion guard on the shimmer.
- `css/card-nav.css` — `.nav-card-link.active` (accent + underline, both
  themes) and avatar hit area bumped to 44x44px (touch-target rule).
- Verified: profile.html/card-nav.css/landing.js serve 200, HTML structure
  balanced, Wchem harness 13/13.

## 2026-08-01 - Fix: clicking navbar avatar logged out instead of opening profile (T-043 cont.)

- User report: clicking the avatar on the navbar signs out instead of going
  to profile.html.
- Root cause: card-nav.js registered the initial CTA handler with
  `addEventListener('click', onCtaClick)` while the avatar navigation was
  assigned to `ctaBtn.onclick` — both fired on click. The original handler
  (landing.js) calls `client.signOut()` when authenticated, so every avatar
  click signed the user out before navigating.
- `js/card-nav.js` — CTA handler now assigned via `ctaBtn.onclick = onCtaClick`
  (single slot, replaceable), so avatar/updateCta handlers override it
  instead of stacking.
- Verified: syntax OK, Wchem harness 13/13.

## 2026-08-01 - Remove user-auth-badge + equal-size feature cards (T-043 cont.)

- User request: delete the `#user-auth-badge` floating div, and make the
  first feature card (`feature-card-large`, spans 2 rows) the same size as
  the other cards in the grid.
- `index.html` — removed `#user-auth-badge` div + comment; removed
  `feature-card-large` class from the first feature card.
- `js/landing.js` — updateAuthUI badge logic (display/HTML/Đăng xuất button)
  removed; only the navbar avatar path remains.
- `css/landing.css` — deleted `.feature-card-large` rules (grid-row span 2
  and the mobile `grid-row: auto` line); grid is now uniform 3-col.
- Verified: no remaining references to either selector, landing.js syntax OK,
  Wchem harness 13/13.

## 2026-08-01 - Profile page loads instantly from cache (T-043 cont.)

- User report: profile page shows the loading skeleton too long despite
  having nothing to load.
- Root cause: the page waited for /api/auth/me + /api/compounds before
  rendering, though name/email/avatar come from the cached session.
- `profile.html` — removed the skeleton shimmer (markup + CSS); profile
  renders immediately from `chemlabClient.user`; /api/auth/me and the
  compound count now refresh in the background (count cell shows "…" then
  the number, or "—" on failure). Logout error feedback kept.
- Verified: no skeleton refs left, HTML balanced, profile.html serves 200.

## 2026-08-01 - Profile edit: name/email/password/avatar (T-043 cont.)

- User report: profile name/email showed "—", and asked to be able to
  change name, email, password, and avatar.
- `taskflow/backend/src/models/User.js` — added `avatar` field (String,
  default '', maxlength 500000) + `toPublic()` now returns avatar.
- `taskflow/backend/src/routes/auth.routes.js` — added `PUT /api/auth/me`
  (update name 2-80 chars, email with format + case-insensitive duplicate
  check → 409, avatar data URL ≤500KB) and `PUT /api/auth/me/password`
  (verify current password → 401, new password ≥8 chars). Both return
  `user.toPublic()`.
- `taskflow/backend/tests/auth.test.js` — 6 new tests (update name/email/
  avatar, duplicate email 409, invalid fields 400, password change ok,
  wrong current 401, short new 400). Backend now 36/36, eslint clean.
- `profile.html` — edit form (avatar file picker with 400KB cap + preview,
  name, email) saving via PUT /api/auth/me and persisting the fresh user
  to the session cache; change-password form with current/new/confirm
  (match + length checks) via PUT /api/auth/me/password; success/error
  inline messages. "—" root cause fixed: when the cached session is empty
  the page now awaits GET /api/auth/me before first paint instead of
  showing placeholders forever (background refresh kept for cached case).
- `js/landing.js` — navbar avatar shows the uploaded image
  (`user.avatar`) when set, else the email initial.
- `css/card-nav.css` — added `.nav-avatar-img` (38px round cover).
- Verified: smoke test register → PUT /me → PUT /me/password round-trip
  on live server; profile.html/landing.js/card-nav.css serve 200; Wchem
  harness 13/13.

## 2026-08-01 - Fix: profile.html buttons dead (Illegal return statement) (T-043 cont.)

- User report: buttons on profile.html do nothing (e.g. saving the name).
- Root cause: the inline `<script type="module">` in profile.html used a
  top-level `return;` (inside the "not authenticated → redirect" guard).
  Chrome/V8 rejects `return` at module top level with
  "Illegal return statement" at PARSE time, so the ENTIRE module script
  aborted — no button handlers (save name/email/avatar, change password,
  lab, logout) were ever attached, and the navbar never initialized.
  Reproduced headlessly with Playwright: PAGEERROR "Illegal return
  statement", name input empty, save click silent.
- `profile.html` — removed the top-level `return;`; the logged-out
  redirect now lives in a tiny classic inline script before card-nav.js
  (`if (!localStorage.getItem('chemlab:token')) location.href =
  'index.html';`) — identical behavior, CSP-safe ('unsafe-inline'
  allowed).
- Verified with Playwright (real Chromium): save name → "Đã lưu ✓" and
  name updates; wrong current password → error shown, correct → "Đã đổi
  mật khẩu ✓" and login works with the new password; name persists after
  reload; lab button navigates; zero console/page errors. Harness 13/13.

## 2026-08-01 - Chem Lab quest kickoff: remove drawing + roadmap (T-044)

- User request: lab.html should become a virtual chemistry lab like
  https://chemistry-en.nobook.com/ but interactable by hand via webcam,
  architected in 3 layers — Lớp 1 Giao diện & Drag-Drop → Lớp 2 Va chạm &
  Ghép nối → Lớp 3 Logic Hóa học & Animation — referencing PhET Scenery
  (scene graph) patterns. Only the "vẽ màu" (color drawing) feature is
  removed; everything else stays. Long-term plan uploaded as a quest file.
- `docs/CHEM-LAB-ROADMAP.md` (new, the quest) — vision, 3-layer
  architecture, task breakdown T-044..T-058, 5 phases G1..G5, per-iteration
  rules (3 files / 300 lines / 1 feature), risks (pinch precision, FPS,
  reaction accuracy, 44px touch targets), expected files.
- `lab.html` — removed #lab-clearCanvas button + #lab-craftToggle /
  #lab-craftItems palette; Demo tab renamed to "Lab" (science icon); About
  text rewritten for the chemistry lab (hand-bridge kept, new modules
  listed); #lab-canvas kept (hand-bridge target). All tracking/gaze/
  calibration/console/tabs intact.
- `js/lab.js` — removed PALETTE, craft menu build/open logic, clear-canvas
  handler, all drawing code (setBrush/dotAt/lineTo/pointers/pointerdown/
  move/up, resizeCanvas, safeSnapshot, clearDemoCanvas, setDemoColor);
  startTracking no longer calls resizeCanvas.
- `css/lab.css` — removed .lab-clear-btn, .lab-craft-toggle/.lab-craft-btn,
  .lab-craft-item (+ mobile media rules); #lab-canvas styles kept.
- Verified: zero references to removed IDs/classes in lab files, lab.js
  syntax OK, harness 13/13, Playwright load of lab.html: 0 craft/clear
  leftovers, 3 tabs, 0 console/page errors; lab.html/lab.js/lab.css serve
  200. Master plan saved to agentmemory (project wchem).

## 2026-08-01 - T-045 research: PhET Scenery pattern guide (DOM-only scene graph)

- User requested research-only study of the PhET Scenery scene-graph library
  source at /tmp/opencode/scenery/ to prep Layer 1 (T-045 js/lab-scene.js)
  for the DOM-only virtual chemistry lab (drag-drop glassware via real mouse
  events from the hand-tracking bridge). No code written, no dependencies.
- Read: nodes/Node.ts (6425 lines), listeners/DragListener.ts,
  listeners/PressListener.ts, input/SceneryEvent.ts, input/Input.ts,
  nodes/DOM.ts, util/Picker.ts, examples/input.html, examples/multi-touch.html.
- `docs/PHET-SCENERY-PATTERNS.md` (new) — distilled guide with Vietnamese
  labels: (A) scene graph essentials — children/parents arrays, last child
  drawn on top, transform as matrix (x/y = m02/m12, local↔global walks),
  cached dirty bounds, Picker.recursiveHitTest order (prune invisible/
  unpickable → cached bounds → local point → children backwards → self
  containsPointSelf → returns Trail root→leaf), addInputListener;
  (B) listener lifecycle — canPress guards (enabled, !isPressed, button,
  !pointer.isAttached) → press attaches listener to the pointer → drag on
  pointerMove → release/interrupt with `interrupted` flag; callbacks are
  start/drag/end (no more startDrag/drag/endDrag); state to track: pointer,
  pressedTrail, isPressed, global/local/parent/model points, grab offset,
  modelDelta; (C) event routing — trailUnderPointer = hitTest(pointer.point),
  dispatch order: attached pointer listeners first (keeps drags alive off-
  target), then leaf→root bubble with handled/aborted stops; enter/exit do
  not bubble; (D) drag arithmetic — translation = globalToParent(point) −
  localToParent(grabOffset) + localToParent(0,0); clamp in model space via
  dragBounds.closestPointTo BEFORE writing; (E) 10 transferable rules —
  model not CSS, topmost-first hit-test, one pointer per drag, bubble for
  ancestors, grab offset at press, clamp in model space, cached bounds,
  interrupt not leak (hand-bridge pointer loss → interrupt()), explicit
  pickable:false, Pointer abstraction over hand-bridge events.
- STATE.md — Current Task T-053 (Lớp 2 item 5: phản hồi va chạm), iteration 52, completed-tasks entry, resume checkpoint updated.
- Verified: lab-collide.spec.js 25/25 (23 existing + 2 new T-053 tests), gesture_tracking 13/13, eslint clean. No new deps.

--- Iteration 52: T-052 Layer 2 stir/filter/lid coupling (DONE) ---

- Task: T-052 (Lớp 2 item 4) — đũa khuấy vào bình (stir), phễu lên
  miệng bình (filter), nắp đậy (seal). Drag tool onto vessel → coupling
  state + visual pulse; drag away → uncouple.
- Files modified (3 files, ~15 lines net):
  - js/lab-collide.js: Fixed 3 bugs + 1 enhancement:
    (1) State key mismatch: replaced TOOL_KIND[tool.type]+'Tool' with
    TOOL_STATE_KEY[tool.type] (stirTool/filterTool/lidTool) in
    _coupleTool, _uncoupleTool, _isToolOn. Added TOOL_STATE_KEY map.
    (2) _hovered() overlap area: added Math.max(0, ...) so nodes
    within tolerance but not actually overlapping are still selected
    as hover targets (was causing stir/beaker coupling to fail when
    gap < tolerance). (3) _onDragStart: added uncouple when dragged
    node is itself a tool with coupledVessel (lifting a tool uncouples
    it from its vessel).
  - js/lab-scene.js: Extended spawnNode state init to include coupling
    fields (heating, heatingBurner, heatingVessel, coupledVessel,
    stirTool, filterTool, lidTool) — prevents undefined vs null issues
    in pristine state checks.
  - tests/lab-collide.spec.js: Fixed missing `up` destructuring in
    test 21 (funnel/lid interrupt test) — test referenced `up` which
    was not in makeScene() destructure.
- Test results: lab-collide 23/23 (was 18/18, +5 new T-052 tests),
  gesture_tracking 13/13, lab-scene 29/29 (batches verified),
  total 65/65. eslint clean.
- STATE.md updated: T-053 marked DONE, T-054 set as current task,
  test counts updated to 67/67, resume checkpoint updated.

--- Iteration 52: T-054 Layer 3 reaction engine (DONE) ---

- Task: T-054 (Lớp 3 item 1) — js/lab-chem.js reaction engine: map tác chất → sản phẩm, cân bằng, điều kiện (nhiệt độ/đun nóng/xúc tác).
- Files modified (1 new file, ~180 lines):
  - js/lab-chem.js (new): Curated reaction database (10 reactions: neutralization, acid–carbonate, combustion, oxidation, electrolysis, precipitation) adapted from taskflow/frontend/src/lib/reactions.ts. Exposes: findReaction(reactantFormulas) → matching Reaction or null; checkConditions(reaction, vesselState) → boolean (gates by heating/catalyst); react(vesselA, vesselB) → Reaction or null (combines lookup + condition check). IIFE, 'use strict', global window.LabChem API, auto-inits on DOMContentLoaded when #lab-bench exists. No external dependencies.
  - tests/lab-chem.spec.js (new): 12 tests covering API exposure, findReaction (match, null, order-independent), checkConditions (no conditions, heating required/met/unmet), react (no match, conditions met, heating required but not met, heating met, no substance). All 12 pass.
- Test results: lab-chem 12/12, lab-collide 25/25, gesture_tracking 13/13, total 50/50. eslint clean.
- STATE.md updated: T-054 marked DONE, T-055 set as current task, test counts updated to 50/50, resume checkpoint updated.

--- Iteration 52: T-053 Layer 2 phản hồi va chạm (DONE) ---

- Task: T-053 (Lớp 2 item 5) — rung/highlight khi ghép sai, log console "Đã đổ X% HCl vào bình".
- Files modified (2 files, ~30 lines net):
  - js/lab-collide.js: Added (1) `.lab-wrong` CSS class (red pulse shake animation, 3 iterations) alongside existing tool styles in TOOL_CSS; (2) `_isWrongTarget()` detects tool over non-target vessel or filled vessel over non-pour-target; (3) `_setWrong()`/`_clearWrong()` toggle `.lab-wrong` class; (4) wrong highlight cleared in `_setHovered(null)` and on drag end; (5) `_logPour()` console logs pour events with substance name, percentage, and target type (e.g. "Đã đổ 50% CuSO4 vào flask").
  - tests/lab-collide.spec.js: Added 2 new T-053 tests: (a) lab-wrong class added when tool dragged over non-target vessel and cleared on move-away; (b) lab-wrong class added when filled vessel dragged over non-pour-target (burner) and cleared on move-away.
- Test results: lab-collide 25/25 (was 23/23, +2 new T-053 tests),
  gesture_tracking 13/13, total 67/67. eslint clean.
- STATE.md updated: T-053 marked DONE, T-054 set as current task,
  test counts updated to 67/67, resume checkpoint updated.
