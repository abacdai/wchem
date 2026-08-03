const assert = require('node:assert/strict');
const test = require('node:test');
const { loadHandBridge, makeHand, makeOpenHand } = require('./harness');

test('gesture tracking smooths landmark jitter without amplifying movement', () => {
  const { api } = loadHandBridge();
  const bank = api.createFilterBank();
  const raw = [0.4, 0.6, 0.4, 0.6, 0.4, 0.6];
  const filtered = raw.map((x, index) => bank[8].x.filter(x, index * 33));
  const largestRawStep = Math.max(...raw.slice(1).map((x, index) => Math.abs(x - raw[index])));
  const largestFilteredStep = Math.max(...filtered.slice(1).map((x, index) => Math.abs(x - filtered[index])));
  assert.ok(largestFilteredStep < largestRawStep, 'filter must reduce frame-to-frame landmark jitter');
});

test('menu click accepts a practical pinch and preserves release hysteresis', () => {
  const { api, button, events } = loadHandBridge();
  const state = { handKey: 'R', pinchState: false, pinchCooldown: 0, pinchHoldFrames: 0, span2DHistory: [], dragMode: null, wasPinching: false, wasFist: false, lastPt: { x: 0, y: 0 } };
  assert.equal(api.resolvePinch(0.15, 1, state), true);
  api.handleInteraction({ x: 20, y: 20 }, true, false, state);
  assert.deepEqual(events, ['pointerdown', 'pointerup', 'click']);
  assert.equal(api.resolvePinch(0.20, 1, state), true, 'pinch remains active inside the hysteresis range');
  state.pinchCooldown = 0;
  assert.equal(api.resolvePinch(0.27, 1, state), false, 'pinch releases past the exit threshold');
  assert.ok(button);
});

test('processFrame samples pinch state exactly once per frame per hand', () => {
  const { api } = loadHandBridge();
  api.processFrame({ landmarks: [makeHand()] });
  const state = api.getHandState('R');
  assert.equal(state.span2DHistory.length, 1, 'primary hand analysis must run once per frame');
});

test('game canvas lookup is cached across frames', () => {
  const { api, queries } = loadHandBridge({ withCanvas: true });
  api.processFrame({ landmarks: [makeHand()] });
  api.processFrame({ landmarks: [makeHand()] });
  const canvasQueries = queries.filter((s) => s === '#handscope-canvas');
  assert.equal(canvasQueries.length, 1, 'canvas querySelector must run once for the cache miss only');
});

test('game canvas rect is cached across frames', () => {
  const { api, rectQueries } = loadHandBridge({ withCanvas: true });
  api.processFrame({ landmarks: [makeHand()] });
  api.processFrame({ landmarks: [makeHand()] });
  assert.equal(rectQueries(), 1, 'getBoundingClientRect must run once for the cache miss only');
});

test('status text is written only when the value changes', () => {
  const { api, gestureWrites } = loadHandBridge();
  api.processFrame({ landmarks: [makeHand()] });
  api.processFrame({ landmarks: [makeHand()] });
  assert.equal(gestureWrites(), 1, 'identical gesture text must not be rewritten every frame');
});

test('analyzeHand omits unused 3D fields and keeps consumers intact', () => {
  const { api } = loadHandBridge();
  const result = api.analyzeHand(makeHand());
  assert.equal(result.extendedCount, 1, 'thumb-only pinch hand must count one extended finger');
  assert.equal(result.pinchFingers.length, 1, 'index finger must be detected as pinching');
  assert.ok(result.span2D > 0 && result.pinch2D > 0, '2D span and pinch distances must be computed');
  assert.ok(!('handSpan' in result), 'unused 3D handSpan must not be computed');
  assert.ok(!('pinchDist' in result), 'unused 3D pinchDist must not be computed');
});

test('canvas rect cache is shared and keyed per element', () => {
  const { api } = loadHandBridge();
  let reads = 0;
  const arCanvas = { getBoundingClientRect() { reads += 1; return { left: 10, top: 20, width: 640, height: 480 }; } };
  const rect = api.getCachedCanvasRect(arCanvas);
  api.getCachedCanvasRect(arCanvas);
  assert.equal(reads, 1, 'second rect read for the same canvas must hit the cache');
  assert.equal(rect.width, 640, 'cached rect values must be returned');
});

test('validateLandmarks keeps accept/reject behavior without allocations', () => {
  const { api } = loadHandBridge();
  assert.equal(api.validateLandmarks(makeHand()), true, 'valid pinch hand must pass');
  assert.equal(api.validateLandmarks(makeOpenHand()), true, 'valid open hand must pass');
  const collapsed = makeHand().map((p) => ({ x: 0.5, y: 0.5, z: 0 }));
  assert.equal(api.validateLandmarks(collapsed), false, 'collapsed hand must fail the width/height check');
  const offFrame = makeHand().map((p) => ({ x: 5, y: 5, z: 0 }));
  assert.equal(api.validateLandmarks(offFrame), false, 'off-frame hand must fail the in-frame check');
});

test('detectPinchFingers keeps finger detection without table allocations', () => {
  const { api } = loadHandBridge();
  const pinch = api.analyzeHand(makeHand());
  const pinchFingers = api.detectPinchFingers(makeHand(), pinch.span2D);
  assert.equal(pinchFingers.length, 1, 'pinch hand must detect exactly one pinching finger');
  assert.equal(pinchFingers[0], 'index', 'pinch hand must detect the index finger');
  const open = api.analyzeHand(makeOpenHand());
  const openFingers = api.detectPinchFingers(makeOpenHand(), open.span2D);
  assert.equal(openFingers.length, 0, 'open hand must detect no pinching fingers');
});

test('AR overlay draws one batched skeleton per hand with the wrapper contract', () => {
  const { api, strokes, fills } = loadHandBridge({ withCanvas: true });
  api.processFrame({ landmarks: [makeHand(), makeOpenHand()] });
  assert.equal(strokes(), 2, 'all connections batch into one stroke path per hand');
  assert.equal(fills(), 2, 'all dots batch into one fill path per hand');
});

test('status events are throttled in steady state but emit on gesture change', () => {
  const { api, dispatchCount } = loadHandBridge();
  api.emitStatus({ handDetected: true, gesture: 'MỞ', source: 'Browser' });
  api.emitStatus({ handDetected: true, gesture: 'MỞ', source: 'Browser' });
  assert.equal(dispatchCount(), 1, 'identical status must not re-dispatch every frame');
  api.emitStatus({ handDetected: true, gesture: 'CHỤM', source: 'Browser' });
  assert.equal(dispatchCount(), 2, 'gesture change must dispatch immediately');
});

test('status bar wires an FPS readout element', () => {
  const { requestedIds } = loadHandBridge();
  assert.ok(requestedIds.includes('hb-fps'), 'bridge must fetch the FPS readout span');
});
