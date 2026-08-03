const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadHandBridge(opts) {
  const withCanvas = !!(opts && opts.withCanvas);
  const events = [];
  const queries = [];
  let dispatchCount = 0;
  let rectQueries = 0;
  const button = {
    dispatchEvent(event) { events.push(event.type); return true; },
  };
  const canvasStub = {
    isConnected: true,
    dispatchEvent() { return true; },
    contains() { return true; },
    getBoundingClientRect() { rectQueries += 1; return { left: 0, top: 0, width: 1280, height: 720 }; },
  };
  let strokeCount = 0;
  let fillCount = 0;
  const arCanvasStub = {
    isConnected: true,
    width: 0,
    height: 0,
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; },
    getContext() {
      return {
        setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
        stroke() { strokeCount += 1; }, arc() {}, fill() { fillCount += 1; },
        strokeStyle: '', lineWidth: 1, fillStyle: '',
      };
    },
  };
  const elements = {};
  const requestedIds = [];
  let gestureWrites = 0;
  ['hb-video', 'hb-gazeDot', 'hb-gazeHint', 'hb-handInfo', 'hb-gazeStatus', 'hb-fps']
    .forEach((id) => { elements[id] = { textContent: '', style: {}, classList: { add() {}, remove() {} } }; });
  const gestureElement = { _textContent: '', style: {}, classList: { add() {}, remove() {} } };
  Object.defineProperty(gestureElement, 'textContent', {
    get() { return this._textContent; },
    set(value) { this._textContent = value; gestureWrites += 1; },
  });
  elements['hb-gesture'] = gestureElement;
  const document = {
    body: { appendChild() {} },
    createElement() { return { innerHTML: '', style: {}, classList: { add() {}, remove() {} } }; },
    getElementById(id) {
      requestedIds.push(id);
      return id === 'kl-arCanvas' ? arCanvasStub : (elements[id] || null);
    },
    querySelector(selector) {
      queries.push(selector);
      return withCanvas && selector === '#handscope-canvas' ? canvasStub : null;
    },
    elementFromPoint() { return button; },
    readyState: 'complete',
  };
  const context = {
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    MouseEvent: class { constructor(type) { this.type = type; } },
    PointerEvent: class { constructor(type) { this.type = type; } },
    WebSocket: { OPEN: 1 },
    clearTimeout() {},
    console: { error() {}, log() {}, warn() {} },
    document,
    performance: { now: () => 0 },
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {},
    setTimeout() { return 1; },
    window: {
      HAND_SCOPE_MANUAL_START: true,
      HANDSCOPE_TARGET_SELECTOR: '#handscope-canvas',
      addEventListener() {},
      dispatchEvent() { dispatchCount += 1; },
      innerHeight: 720, innerWidth: 1280,
    },
  };
  context.window.window = context.window;
  let source = fs.readFileSync(path.join(__dirname, '..', 'js', 'hand-bridge.js'), 'utf8');
  source = source.replace(
    '  window.HandScope = {',
    '  window.__handBridgeTestApi = { createFilterBank, analyzeHand, validateLandmarks, detectPinchFingers, resolvePinch, handleInteraction, processFrame, getHandState, emitStatus, getCachedCanvasRect };\n  window.HandScope = {'
  );
  vm.runInNewContext(source, context, { filename: 'hand-bridge.js' });
  return { api: context.window.__handBridgeTestApi, button, events, queries, dispatchCount: () => dispatchCount, rectQueries: () => rectQueries, gestureWrites: () => gestureWrites, strokes: () => strokeCount, fills: () => fillCount, requestedIds };
}

function makeOpenHand() {
  const lm = [];
  for (let i = 0; i < 21; i += 1) {
    const a = (i / 21) * Math.PI * 2;
    lm.push({ x: 0.4 + 0.25 * Math.cos(a), y: 0.4 + 0.25 * Math.sin(a), z: 0 });
  }
  return lm;
}

function makeHand() {
  const lm = [];
  for (let i = 0; i < 21; i += 1) {
    const a = (i / 21) * Math.PI * 2;
    lm.push({ x: 0.4 + 0.25 * Math.cos(a), y: 0.4 + 0.25 * Math.sin(a), z: 0 });
  }
  lm[4] = { x: 0.4, y: 0.62, z: 0 };
  lm[8] = { x: 0.42, y: 0.62, z: 0 };
  return lm;
}

module.exports = { loadHandBridge, makeHand, makeOpenHand };
