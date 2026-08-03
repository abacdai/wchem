/* =========================================================
   HAND//SCOPE bridge — lớp theo dõi tay & phát sự kiện chuột
   -----------------------------------------------------------
   File này KHÔNG chứa logic ứng dụng nào — chỉ theo dõi tay bằng
   MediaPipe rồi PHÁT SINH sự kiện chuột thật (mousedown/mousemove/
   mouseup/click) lên đúng phần tử DOM mà trang chủ chỉ định — y hệt
   một người dùng chuột thật. Nhúng được vào bất kỳ trang nào, không
   phụ thuộc ứng dụng cụ thể (xem window.HANDSCOPE_TARGET_SELECTOR).

   Hai cử chỉ:
     - Chụm ngón cái + trỏ  → mousedown/kéo (vẽ) hoặc click nút UI
     - Nắm tay              → mousedown nút phải (xóa/thao tác phụ)
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     0. HẰNG SỐ
     --------------------------------------------------------- */
  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17],
  ];

  const SMOOTH_MINCUTOFF = 0.6;
  const SMOOTH_BETA = 0.3;
  const SMOOTH_DCUTOFF = 1.0;

  let PINCH_ENTER_RATIO = 0.16;
  let PINCH_EXIT_RATIO = 0.26;

  let ACTIVE_MARGIN_X = 0.16;
  let ACTIVE_MARGIN_Y = 0.10;

  const HAND_LOST_GRACE_MS = 500;
  const PINCH_FORCE_RELEASE_FRAMES = 30;
  // While no hand is in view, keep the model at a low polling rate (~10 Hz)
  // instead of a full inference every rAF tick; full rate resumes within one
  // idle gap once a hand reappears (<=100 ms + inference time).
  const IDLE_DETECT_GAP_MS = 100;

  // Backend native process — nếu chạy được, tracking chạy ngoài trình
  // duyệt (Python + OpenCV + MediaPipe), stream landmark qua WebSocket.
  // Fallback về in-browser MediaPipe nếu không kết nối được.
  const BACKEND_WS_URL = window.HANDSCOPE_BACKEND_URL || 'ws://localhost:8765';
  let backendWs = null;
  let backendActive = false;

  /* ---------------------------------------------------------
     1. BỘ LỌC ONE-EURO (giảm rung, giữ độ trễ thấp)
      --------------------------------------------------------- */
  class OneEuroFilter {
    constructor(mincutoff = SMOOTH_MINCUTOFF, beta = SMOOTH_BETA, dcutoff = SMOOTH_DCUTOFF) {
      this.mincutoff = mincutoff;
      this.beta = beta;
      this.dcutoff = dcutoff;
      this.xPrev = null;
      this.dxPrev = 0;
      this.ddxPrev = 0;
      this.tPrev = null;
    }
    static alpha(cutoff, dt) {
      const tau = 1.0 / (2 * Math.PI * cutoff);
      return 1.0 / (1.0 + tau / dt);
    }
    filter(x, tMs) {
      if (this.tPrev == null) {
        this.tPrev = tMs; this.xPrev = x; this.dxPrev = 0; this.ddxPrev = 0;
        return x;
      }
      const dt = Math.max((tMs - this.tPrev) / 1000, 1 / 120);
      this.tPrev = tMs;
      const dx = (x - this.xPrev) / dt;
      const aD = OneEuroFilter.alpha(this.dcutoff, dt);
      const dxHat = aD * dx + (1 - aD) * this.dxPrev;
      const ddx = (dxHat - this.dxPrev) / dt;
      const ddxAlpha = OneEuroFilter.alpha(0.3, dt);
      this.ddxPrev = ddxAlpha * ddx + (1 - ddxAlpha) * this.ddxPrev;
      const cutoff = this.mincutoff + this.beta * Math.abs(dxHat);
      const a = OneEuroFilter.alpha(cutoff, dt);
      const xHat = a * x + (1 - a) * this.xPrev;
      this.xPrev = xHat; this.dxPrev = dxHat;
      return xHat;
    }
    predict(dt) {
      if (this.tPrev == null) return 0;
      return this.xPrev + this.dxPrev * dt + 0.5 * this.ddxPrev * dt * dt;
    }
  }

  function createFilterBank() {
    const bank = [];
    for (let i = 0; i < 21; i += 1) bank.push({ x: new OneEuroFilter(), y: new OneEuroFilter() });
    return bank;
  }

  let filterBanks = {};
  function getFilterBank(key) {
    if (!filterBanks[key]) filterBanks[key] = createFilterBank();
    return filterBanks[key];
  }

  function smoothLandmarks(landmarks, tMs, bank) {
    return landmarks.map((lm, i) => ({
      x: bank[i].x.filter(lm.x, tMs),
      y: bank[i].y.filter(lm.y, tMs),
      z: lm.z,
    }));
  }

  let lastKnownLandmarks = null;
  let lastKnownTime = 0;
  let lastKnownBank = null;

  function predictLandmarks(tMs, confidence = 1) {
    if (!lastKnownLandmarks || !lastKnownBank) return null;
    const dt = Math.max((tMs - lastKnownTime) / 1000, 1 / 120);
    const elapsed = tMs - lastKnownTime;
    const decay = Math.max(0, 1 - elapsed / HAND_LOST_GRACE_MS);
    const blend = Math.min(1, confidence * decay);
    const fade = Math.pow(blend, 0.7);
    return lastKnownLandmarks.map((lm, i) => {
      const predX = lastKnownBank[i].x.predict(dt);
      const predY = lastKnownBank[i].y.predict(dt);
      return {
        x: predX * fade + lm.x * (1 - fade),
        y: predY * fade + lm.y * (1 - fade),
        z: lm.z,
      };
    });
  }

  /* ---------------------------------------------------------
     2. TẠO DOM CHO LỚP PHỦ (không đụng tới HTML gốc)
     --------------------------------------------------------- */
  const root = document.createElement('div');
  root.id = 'hb-root';
  root.innerHTML = `
    <video id="hb-video" playsinline autoplay muted></video>
    <div id="hb-status"><span id="hb-fps"></span><span id="hb-gesture">—</span><span id="hb-handInfo"></span><span id="hb-gazeStatus"></span><span id="hb-headPose"></span></div>
    <div id="hb-gazeDot"></div>
    <div id="hb-gazeHint">Nhìn vào chỗ muốn trỏ, sau đó dùng cử chỉ tay để tương tác</div>
  `;
  document.body.appendChild(root);

  const video = document.getElementById('hb-video');
  const gazeDotEl = document.getElementById('hb-gazeDot');
  const gazeHintEl = document.getElementById('hb-gazeHint');
  const gestureEl = document.getElementById('hb-gesture');
  const handInfoEl = document.getElementById('hb-handInfo');
  const gazeStatusEl = document.getElementById('hb-gazeStatus');
  const fpsEl = document.getElementById('hb-fps');

  // Writing identical textContent still invalidates the text node's style
  // every frame; skip the write when nothing changed.
  function setTextOnce(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }



  /* ---------------------------------------------------------
     3. PHÂN TÍCH CỬ CHỈ
     --------------------------------------------------------- */
  const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));

  const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const PINCH_FINGER_RATIO = 0.20;

  function detectPinchFingers(lm, span2D) {
    const thumbTip = lm[4];
    const keys = [];
    if (dist2(thumbTip, lm[8]) / span2D < PINCH_FINGER_RATIO) keys.push('index');
    if (dist2(thumbTip, lm[12]) / span2D < PINCH_FINGER_RATIO) keys.push('middle');
    if (dist2(thumbTip, lm[16]) / span2D < PINCH_FINGER_RATIO) keys.push('ring');
    if (dist2(thumbTip, lm[20]) / span2D < PINCH_FINGER_RATIO) keys.push('pinky');
    return keys;
  }

  function pinchDisplayName(pinchFingers) {
    const map = { index: 'trỏ', middle: 'giữa', ring: 'nhẫn', pinky: 'út' };
    if (pinchFingers.length === 0) return '';
    if (pinchFingers.length === 1) return `+${map[pinchFingers[0]]}`;
    return `+${pinchFingers.length}`;
  }

  function analyzeHand(lm) {
    const wrist = lm[0];
    const extended = {
      thumb: dist3(lm[4], wrist) > dist3(lm[2], wrist) * 1.15,
      index: dist3(lm[8], wrist) > dist3(lm[6], wrist) * 1.05,
      middle: dist3(lm[12], wrist) > dist3(lm[10], wrist) * 1.05,
      ring: dist3(lm[16], wrist) > dist3(lm[14], wrist) * 1.05,
      pinky: dist3(lm[20], wrist) > dist3(lm[18], wrist) * 1.05,
    };
    let extendedCount = 0;
    if (extended.thumb) extendedCount++;
    if (extended.index) extendedCount++;
    if (extended.middle) extendedCount++;
    if (extended.ring) extendedCount++;
    if (extended.pinky) extendedCount++;
    const span2D = Math.hypot(lm[0].x - lm[9].x, lm[0].y - lm[9].y) || 0.001;
    const pinch2D = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
    const pinchFingers = detectPinchFingers(lm, span2D);
    return { extended, extendedCount, span2D, pinch2D, pinchFingers };
  }

  const handStates = {};

  function getHandState(key) {
    if (!handStates[key]) {
      handStates[key] = {
        handKey: key,
        pinchState: false,
        pinchCooldown: 0,
        pinchHoldFrames: 0,
        span2DHistory: [],
        dragMode: null,
        wasPinching: false,
        wasFist: false,
        lastPt: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      };
    }
    return handStates[key];
  }

  function resolvePinch(pinch2D, span2D, state) {
    if (state.pinchCooldown > 0) state.pinchCooldown--;
    state.span2DHistory.push(span2D);
    if (state.span2DHistory.length > 10) state.span2DHistory.shift();
    const avgSpan = state.span2DHistory.reduce((a, b) => a + b, 0) / state.span2DHistory.length;
    const ratio = pinch2D / avgSpan;

    if (!state.pinchState) {
      if (ratio < PINCH_ENTER_RATIO && state.pinchCooldown === 0) {
        state.pinchState = true;
        state.pinchHoldFrames = 0;
        state.pinchCooldown = 3;
      }
    } else {
      state.pinchHoldFrames++;
      if ((ratio > PINCH_EXIT_RATIO && state.pinchCooldown === 0) || state.pinchHoldFrames > PINCH_FORCE_RELEASE_FRAMES) {
        state.pinchState = false;
        state.span2DHistory = [];
        state.pinchCooldown = 3;
      }
    }
    return state.pinchState;
  }

  /* ---------------------------------------------------------
     3b. GAZE-ASSISTED TARGETING (backend → gaze data)
      --------------------------------------------------------- */
  let gazePoint = null;
  let gazeEnabled = false;

  /* ---------------------------------------------------------
     4. ÁNH XẠ TỌA ĐỘ TAY → TOÀN MÀN HÌNH
     --------------------------------------------------------- */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function mapToScreen(nx, ny) {
    const gameCanvas = getGameCanvas();
    if (gameCanvas) {
      const rect = getCachedCanvasRect(gameCanvas);
      return {
        x: rect.left + (1 - nx) * rect.width,
        y: rect.top + ny * rect.height,
      };
    }
    return { x: (1 - nx) * window.innerWidth, y: ny * window.innerHeight };
  }

  /* ---------------------------------------------------------
     5. PHÁT SINH SỰ KIỆN CHUỘT THẬT LÊN SANDBOXELS
     --------------------------------------------------------- */
  var pointerIds = { R: 1, L: 2 };

  function dispatchMouse(type, target, x, y, button, handKey) {
    var pid = handKey ? (pointerIds[handKey] || 1) : 1;
    var ev = new PointerEvent(type, {
      clientX: x, clientY: y, button, pointerId: pid,
      pointerType: 'pen', isPrimary: handKey === 'R',
      bubbles: true, cancelable: true, view: window,
    });
    target.dispatchEvent(ev);
  }

  // HandScope không còn gắn cứng vào Sandboxels — mục tiêu tương tác (nơi
  // pinch = vẽ/kéo thay vì bấm UI) được cấu hình từ bên ngoài. Trang chủ
  // (hoặc dự án nhúng HandScope) đặt window.HANDSCOPE_TARGET_SELECTOR
  // trỏ tới selector của canvas/khu vực muốn "vẽ", mặc định '#handscope-canvas'.
  let cachedGameCanvas = null;
  let cachedGameCanvasSelector = null;

  function getGameCanvas() {
    const selector = window.HANDSCOPE_TARGET_SELECTOR || '#handscope-canvas';
    if (cachedGameCanvasSelector !== selector) {
      cachedGameCanvasSelector = selector;
      cachedGameCanvas = document.querySelector(selector);
    } else if (cachedGameCanvas && cachedGameCanvas.isConnected === false) {
      cachedGameCanvas = document.querySelector(selector);
    }
    return cachedGameCanvas;
  }

  // getBoundingClientRect() is a layout read that runs every frame per hand in
  // mapToScreen; the canvas lives in a fixed, overflow-hidden viewport, so its
  // viewport-relative rect only changes on resize (or host-page scroll), which
  // invalidate the cache below.
  // Keyed per canvas element: mapToScreen and drawArOverlay alternate between
  // two canvases each frame, so a single-slot cache would thrash and re-read
  // the rect every frame. Invalidate all entries on resize/scroll.
  const cachedCanvasRects = new Map();

  function getCachedCanvasRect(canvas) {
    let rect = cachedCanvasRects.get(canvas);
    if (rect === undefined) {
      rect = canvas.getBoundingClientRect();
      cachedCanvasRects.set(canvas, rect);
    }
    return rect;
  }

  window.addEventListener('resize', function () { cachedCanvasRects.clear(); });
  window.addEventListener('scroll', function () { cachedCanvasRects.clear(); }, { passive: true });

  function endAnyDrag(handKey) {
    if (handKey) {
      const state = handStates[handKey];
      if (state && state.dragMode) {
        dispatchMouse('mouseup', window, state.lastPt.x, state.lastPt.y, state.dragMode === 'erase' ? 2 : 0, handKey);
        state.dragMode = null;
        state.wasPinching = false;
        state.wasFist = false;
      }
    } else {
      Object.keys(handStates).forEach(function (k) {
        const s = handStates[k];
        if (s && s.dragMode) {
          dispatchMouse('mouseup', window, s.lastPt.x, s.lastPt.y, s.dragMode === 'erase' ? 2 : 0, k);
          s.dragMode = null;
        }
        s.wasPinching = false;
        s.wasFist = false;
      });
    }
  }

  function handleInteraction(pt, isPinching, isFist, state) {
    const hk = state.handKey || 'R';
    const gameCanvas = getGameCanvas();

    if (isPinching && !state.wasPinching) {
      const el = document.elementFromPoint(pt.x, pt.y);
      if (el && gameCanvas && (el === gameCanvas || gameCanvas.contains(el))) {
        dispatchMouse('pointerdown', gameCanvas, pt.x, pt.y, 0, hk);
        state.dragMode = 'paint';
      } else if (el) {
        dispatchMouse('pointerdown', el, pt.x, pt.y, 0, hk);
        dispatchMouse('pointerup', el, pt.x, pt.y, 0, hk);
        el.dispatchEvent(new MouseEvent('click', { clientX: pt.x, clientY: pt.y, bubbles: true, cancelable: true, view: window }));
      }
    } else if (isPinching && state.wasPinching && state.dragMode === 'paint') {
      dispatchMouse('pointermove', window, pt.x, pt.y, 0, hk);
    } else if (!isPinching && state.wasPinching && state.dragMode === 'paint') {
      dispatchMouse('pointerup', window, pt.x, pt.y, 0, hk);
      state.dragMode = null;
    }

    if (isFist && !state.wasFist && !isPinching) {
      const el = document.elementFromPoint(pt.x, pt.y);
      if (el && gameCanvas && (el === gameCanvas || gameCanvas.contains(el))) {
        dispatchMouse('pointerdown', gameCanvas, pt.x, pt.y, 2, hk);
        state.dragMode = 'erase';
      }
    } else if (isFist && state.wasFist && state.dragMode === 'erase') {
      dispatchMouse('pointermove', window, pt.x, pt.y, 2, hk);
    } else if (!isFist && state.wasFist && state.dragMode === 'erase') {
      dispatchMouse('pointerup', window, pt.x, pt.y, 2, hk);
      state.dragMode = null;
    }

    state.wasPinching = isPinching;
    state.wasFist = isFist;
    state.lastPt = pt;
  }

  /* ---------------------------------------------------------
     6. VẼ KHUNG TAY TRONG Ô CAMERA NHỎ + CON TRỎ TOÀN MÀN HÌNH
     --------------------------------------------------------- */
  function drawHandSkeleton(ctx, landmarks, w, h, color, lineW, dotR) {
    const pts = landmarks.map((lm) => ({ x: w - lm.x * w, y: lm.y * h }));
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    HAND_CONNECTIONS.forEach(([a, b]) => {
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
    });
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach((p) => {
      ctx.moveTo(p.x + dotR, p.y);
      ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
    });
    ctx.fill();
  }

  function drawPip(_landmarks) {
    // camera preview disabled, status shown in #hb-status
  }

  function drawArOverlay(hands) {
    const arCanvas = document.getElementById('kl-arCanvas');
    if (!arCanvas) return;
    const rect = getCachedCanvasRect(arCanvas);
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.max(1, Math.round(rect.width * dpr));
    const targetH = Math.max(1, Math.round(rect.height * dpr));
    if (arCanvas.width !== targetW) arCanvas.width = targetW;
    if (arCanvas.height !== targetH) arCanvas.height = targetH;
    const actx = arCanvas.getContext('2d');
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
    actx.clearRect(0, 0, rect.width, rect.height);
    if (!hands) return;
    const arColors = ['rgba(127,149,255,0.55)', 'rgba(255,180,84,0.55)'];
    const list = Array.isArray(hands) ? hands : [hands];
    list.forEach((h, i) => {
      drawHandSkeleton(actx, h.landmarks, rect.width, rect.height, arColors[i % 2], 2, 3);
    });
  }

  let lastStatusSignature = '';
  let statusFramesSinceEmit = 0;
  const STATUS_HEARTBEAT_FRAMES = 5;

  function emitStatus(extra) {
    const signature = String(extra.handDetected) + '|' + (extra.gesture || '') + '|' + (extra.source || '');
    statusFramesSinceEmit++;
    if (signature === lastStatusSignature && statusFramesSinceEmit < STATUS_HEARTBEAT_FRAMES) return;
    lastStatusSignature = signature;
    statusFramesSinceEmit = 0;
    window.dispatchEvent(new CustomEvent('handscope:status', {
      detail: Object.assign({ fps: Math.round(fpsSmooth), cameraOn: true }, extra),
    }));
  }

  /* ---------------------------------------------------------
     7. KIỂM TRA LANDMARK HỢP LỆ (chống tilt/mất nửa tay)
      --------------------------------------------------------- */
  function validateLandmarks(lm) {
    if (lm.length < 21) return false;
    let inFrame = 0;
    for (let i = 0; i < lm.length; i++) {
      const p = lm[i];
      if (p.x >= -0.2 && p.x <= 1.2 && p.y >= -0.2 && p.y <= 1.2) inFrame++;
    }
    if (inFrame < 6) return false;
    let keyPointsInFrame = 0;
    if (lm[4].x >= -0.1 && lm[4].x <= 1.1 && lm[4].y >= -0.1 && lm[4].y <= 1.1) keyPointsInFrame++;
    if (lm[8].x >= -0.1 && lm[8].x <= 1.1 && lm[8].y >= -0.1 && lm[8].y <= 1.1) keyPointsInFrame++;
    if (lm[0].x >= -0.1 && lm[0].x <= 1.1 && lm[0].y >= -0.1 && lm[0].y <= 1.1) keyPointsInFrame++;
    if (lm[9].x >= -0.1 && lm[9].x <= 1.1 && lm[9].y >= -0.1 && lm[9].y <= 1.1) keyPointsInFrame++;
    if (keyPointsInFrame < 2) return false;
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (let i = 0; i < lm.length; i++) {
      if (lm[i].x < minX) minX = lm[i].x;
      if (lm[i].x > maxX) maxX = lm[i].x;
      if (lm[i].y < minY) minY = lm[i].y;
      if (lm[i].y > maxY) maxY = lm[i].y;
    }
    const w = maxX - minX, h = maxY - minY;
    if (w < 0.015 || h < 0.015) return false;
    return true;
  }

  /* ---------------------------------------------------------
     8. XỬ LÝ KẾT QUẢ HAND LANDMARKER
      --------------------------------------------------------- */
  let handPresent = false;
  let missingSince = null;
  let fpsSmooth = 0;
  let activeHandedness = null;

  function detectHandedness(results, index) {
    const h = results && results.handedness && results.handedness[index] && results.handedness[index][0];
    return h ? h.categoryName.substring(0, 1) : null;
  }

  function processFrame(results) {
    const now = performance.now();
    const rawHands = results && results.landmarks ? results.landmarks : [];
    let validHands = [];

    for (let i = 0; i < rawHands.length; i++) {
      const h = detectHandedness(results, i) || (i === 0 ? 'R' : 'L');
      const fb = getFilterBank(h);
      const smoothed = smoothLandmarks(rawHands[i], now, fb);
      if (validateLandmarks(smoothed)) {
        validHands.push({ landmarks: smoothed, handedness: h, filterBank: fb });
      }
    }

    if (validHands.length > 0) {
      if (!handPresent) {
        handPresent = true;
        missingSince = null;
      }

      drawPip(validHands);
      drawArOverlay(validHands);

      var right = validHands.find(function (v) { return v.handedness === 'R'; });
      var primary = right || validHands[0];
      var primaryInfo = null;

      validHands.forEach(function (v) {
        var hk = v.handedness;
        if (hk !== 'R' && hk !== 'L') hk = 'R';
        var state = getHandState(hk);
        var analysis = analyzeHand(v.landmarks);
        var isPinching = resolvePinch(analysis.pinch2D, analysis.span2D, state);
        var isFist = !isPinching && analysis.extendedCount === 0;

        if (v === primary) {
          primaryInfo = { hk: hk, analysis: analysis, pinching: isPinching, fist: isFist };
        }

        var tip = isPinching || isFist
          ? { x: (v.landmarks[4].x + v.landmarks[8].x) / 2, y: (v.landmarks[4].y + v.landmarks[8].y) / 2 }
          : v.landmarks[8];
        var pt = mapToScreen(tip.x, tip.y);

        if (gazeEnabled && gazePoint && !isPinching && !state.dragMode) {
          var GAZE_BIAS = window.HANDSCOPE_GAZE_BIAS || 0.25;
          pt.x = pt.x * (1 - GAZE_BIAS) + gazePoint.x * GAZE_BIAS;
          pt.y = pt.y * (1 - GAZE_BIAS) + gazePoint.y * GAZE_BIAS;
        }

        handleInteraction(pt, isPinching, isFist, state);
      });

      activeHandedness = primaryInfo ? primaryInfo.hk : primary.handedness;
      lastKnownLandmarks = primary.landmarks;
      lastKnownBank = primary.filterBank;
      lastKnownTime = now;

      var pAnalysis = primaryInfo ? primaryInfo.analysis : analyzeHand(primary.landmarks);
      var pPinching = primaryInfo ? primaryInfo.pinching : false;
      var pFist = primaryInfo ? primaryInfo.fist : false;
      var gestureName = pPinching
        ? 'CHỤM' + (pAnalysis.pinchFingers.length > 1 ? '(' + pAnalysis.pinchFingers.length + ')' : '')
        : pFist ? 'NẮM' : 'MỞ';
      var multi = validHands.length > 1 ? ' +' + (validHands.length - 1) : '';
      setTextOnce(gestureEl, gestureName + (gazePoint ? ' GZ' : ''));
      setTextOnce(handInfoEl, primary.handedness + multi);
      emitStatus({ handDetected: true, gesture: gestureName, x: 0, y: 0, source: 'Browser', hands: validHands.length });
    } else {
      if (handPresent && missingSince == null) missingSince = now;

      var elapsed = missingSince != null ? now - missingSince : 0;

      if (handPresent && elapsed <= HAND_LOST_GRACE_MS) {
        var conf = 1 - elapsed / HAND_LOST_GRACE_MS;
        var predicted = predictLandmarks(now, conf);
        if (predicted) {
          var hk = activeHandedness || 'R';
          var state = getHandState(hk);
          var analysis = analyzeHand(predicted);
          var isPinching = resolvePinch(analysis.pinch2D, analysis.span2D, state);
          var isFist = !isPinching && analysis.extendedCount === 0;
          var tip = isPinching || isFist
            ? { x: (predicted[4].x + predicted[8].x) / 2, y: (predicted[4].y + predicted[8].y) / 2 }
            : predicted[8];
          var pt = mapToScreen(tip.x, tip.y);
          if (gazeEnabled && gazePoint && !isPinching && !state.dragMode) {
            var GAZE_BIAS = window.HANDSCOPE_GAZE_BIAS || 0.25;
            pt.x = pt.x * (1 - GAZE_BIAS) + gazePoint.x * GAZE_BIAS;
            pt.y = pt.y * (1 - GAZE_BIAS) + gazePoint.y * GAZE_BIAS;
          }
          drawPip({ landmarks: predicted });
          drawArOverlay({ landmarks: predicted });
          handleInteraction(pt, isPinching, isFist, state);
          var gestureName = isPinching
            ? 'CHỤM' + (analysis.pinchFingers.length > 1 ? '(' + analysis.pinchFingers.length + ')' : '')
            : isFist ? 'NẮM' : 'MỞ';
          setTextOnce(gestureEl, gestureName + (gazePoint ? ' GZ' : ''));
          setTextOnce(handInfoEl, activeHandedness || '');
          emitStatus({ handDetected: true, gesture: gestureName, x: Math.round(pt.x), y: Math.round(pt.y), predicting: true, source: 'Browser' });
        } else {
          drawPip(null);
          drawArOverlay(null);
        }
      } else if (handPresent) {
        handPresent = false;
        missingSince = null;
        lastKnownLandmarks = null;
        lastKnownBank = null;
        activeHandedness = null;
        filterBanks = {};
        endAnyDrag();
        Object.keys(handStates).forEach(function (k) { delete handStates[k]; });
        setTextOnce(gestureEl, '—');
        emitStatus({ handDetected: false, gesture: null, source: 'Browser' });
        drawPip(null);
        drawArOverlay(null);
      } else {
        drawPip(null);
        drawArOverlay(null);
      }
    }
  }

  /* ---------------------------------------------------------
     9a. BACKEND WebSocket — tracking ngoài trình duyệt
       --------------------------------------------------------- */
  function processBackendData(data) {
    const now = performance.now();
    if (data.fps != null) {
      fpsSmooth = fpsSmooth ? fpsSmooth * 0.9 + data.fps * 0.1 : data.fps;
    }

    // Gaze from backend
    if (data.gaze) {
      const g = data.gaze;
      if (typeof g.horizontalRatio === 'number' && typeof g.verticalRatio === 'number') {
        const gx = (1 - g.horizontalRatio) * window.innerWidth;
        const gy = g.verticalRatio * window.innerHeight;
        gazePoint = { x: gx, y: gy };
        gazeDotEl.style.left = `${gx}px`;
        gazeDotEl.style.top = `${gy}px`;
        gazeDotEl.classList.add('hb-visible');

        const method = g.pupilMethod === 'ellipse' ? 'ELP' : g.pupilMethod === 'image' ? 'IMG' : 'LMK';
        const cal = g.calibrated ? 'C' : 'c';
        const gv3d = g.gazeVector ? ' 3D' : '';
        gazeStatusEl.textContent = `GZ:ok(${method}/${cal}${gv3d})`;
        gazeStatusEl.className = 'gs-ok';
        gazeEnabled = true;

        // Head pose
        const hp = document.getElementById('hb-headPose');
        if (g.headPose) {
          hp.textContent = `Y${g.headPose.yaw}P${g.headPose.pitch}R${g.headPose.roll}`;
          hp.style.display = '';
        } else {
          hp.textContent = '';
        }
      } else {
        gazeDotEl.classList.remove('hb-visible');
        gazeStatusEl.textContent = 'GZ:no-face';
        gazeStatusEl.className = 'gs-init';
      }
    }

    // Multi-hand tracking
    var backendDetected = false;
    if (data.hands && data.hands.length > 0) {
      backendDetected = true;
      if (!backendActive) { backendActive = true; }

      data.hands.forEach(function (hd) {
        var landmarks = hd.landmarks;
        var isPinching = hd.gesture === 'pinch';
        var isFist = hd.gesture === 'fist';

        var hk = hd.handId || 'R';
        if (hk.length > 1) hk = hk.substring(0, 1).toUpperCase();
        if (hk !== 'R' && hk !== 'L') hk = 'R';
        var state = getHandState(hk);

        var tip = isPinching || isFist
          ? { x: (landmarks[4].x + landmarks[8].x) / 2, y: (landmarks[4].y + landmarks[8].y) / 2 }
          : landmarks[8];
        var pt = mapToScreen(tip.x, tip.y);

        if (gazeEnabled && gazePoint && !isPinching && !state.dragMode) {
          var GAZE_BIAS = window.HANDSCOPE_GAZE_BIAS || 0.25;
          pt.x = pt.x * (1 - GAZE_BIAS) + gazePoint.x * GAZE_BIAS;
          pt.y = pt.y * (1 - GAZE_BIAS) + gazePoint.y * GAZE_BIAS;
        }

        drawPip({ landmarks: landmarks });
        drawArOverlay({ landmarks: landmarks });
        handleInteraction(pt, isPinching, isFist, state);

        var gestureName = isPinching ? 'CHỤM' : isFist ? 'NẮM' : 'MỞ';
        setTextOnce(gestureEl, gestureName + (gazePoint ? ' GZ' : ''));
        setTextOnce(handInfoEl, hk);
        emitStatus({ handDetected: true, gesture: gestureName, handId: hk, x: Math.round(pt.x), y: Math.round(pt.y), source: 'Backend' });
      });
    }

    if (!backendDetected) {
      if (backendActive) {
        backendActive = false;
        missingSince = null;
        endAnyDrag();
        Object.keys(handStates).forEach(function (k) { delete handStates[k]; });
      }
      gestureEl.textContent = '—';
      emitStatus({ handDetected: false, gesture: null, source: 'Backend' });
      drawPip(null);
      drawArOverlay(null);
    }
  }

  async function connectBackend() {
    const url = BACKEND_WS_URL;
    try {
      const ws = await new Promise((resolve, reject) => {
        const sock = new WebSocket(url);
        sock.onopen = () => resolve(sock);
        sock.onerror = () => reject(new Error('WebSocket connection failed'));
        sock.onclose = () => { if (backendActive) backendActive = false; };
        setTimeout(() => reject(new Error('WebSocket timeout')), 2000);
      });
      backendWs = ws;
      console.log(`[HandScope] Connected to backend at ${url}`);

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'frame') processBackendData(data);
        } catch (e) { /* ignore malformed */ }
      };

      ws.onclose = () => {
        if (!started) return;
        console.warn('[HandScope] Backend disconnected, falling back to browser tracking');
        backendWs = null;
        if (backendActive) {
          backendActive = false;
          endAnyDrag();
          emitStatus({ handDetected: false, gesture: null, source: 'Backend' });
          drawPip(null);
        }
        startBrowserTracking();
        scheduleBackendRetry();
      };
      return true;
    } catch (err) {
      console.log('[HandScope] Backend unavailable, using in-browser tracking');
      backendWs = null;
      return false;
    }
  }

  function sendBackendConfig(sensitivity, pinch) {
    if (!backendWs || backendWs.readyState !== WebSocket.OPEN) return;
    backendWs.send(JSON.stringify({
      type: 'config',
      sensitivity: sensitivity || {},
      pinchThresholds: pinch || {},
    }));
  }

  function stopBrowserTracking() {
    if (detectLoopId) {
      cancelAnimationFrame(detectLoopId);
      detectLoopId = null;
    }
    handLandmarker = null;
    handPresent = false;
    backendActive = false;
    filterBanks = {};
    lastKnownLandmarks = null;
  }

  /* ---------------------------------------------------------
     9b. INIT — thử backend trước, fallback về browser
      --------------------------------------------------------- */
  let started = false;
  let handLandmarker = null;
  let detectLoopId = null;
  let backendRetryTimer = null;

  async function init() {
    if (started) return;
    started = true;

    const connected = await connectBackend();
    if (connected) {
      return;
    }

    await startBrowserTracking();
    scheduleBackendRetry();
  }

  let backendRetryCount = 0;
  const BACKEND_MAX_RETRIES = 3;

  function scheduleBackendRetry() {
    if (backendRetryCount >= BACKEND_MAX_RETRIES) return;
    clearTimeout(backendRetryTimer);
    const delay = 3000 + backendRetryCount * 4000;
    backendRetryTimer = setTimeout(async () => {
      if (backendWs) return;
      backendRetryCount++;
      console.log('[HandScope] Retrying backend connection (' + backendRetryCount + '/' + BACKEND_MAX_RETRIES + ')...');
      const ok = await connectBackend();
      if (ok) {
        backendRetryCount = 0;
        console.log('[HandScope] Backend reconnected, switching from browser');
        stopBrowserTracking();
      } else {
        scheduleBackendRetry();
      }
    }, delay);
  }

  /* ---------------------------------------------------------
     9c. BROWSER MEDIAPIPE — fallback khi không có backend
      --------------------------------------------------------- */
  async function startBrowserTracking() {
    try {
      const { HandLandmarker, FilesetResolver } = await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
      );

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );

      const useGPU = window.HANDSCOPE_GPU_DELEGATE !== false;
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
          delegate: useGPU ? 'GPU' : 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch (err) {
      started = false;
      console.error('[HandScope] Không thể tải mô hình nhận diện tay:', err);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      });
      video.srcObject = stream;
      await video.play();
      window.dispatchEvent(new CustomEvent('handscope:camera-started'));
    } catch (err) {
      started = false;
      console.error('[HandScope] Không thể truy cập camera:', err);
      return;
    }

    if (window.HANDSCOPE_ENABLE_GAZE) {
      console.log('[HandScope] Gaze enabled (browser + backend)');
      gazeHintEl.classList.remove('hb-shown');
      window.addEventListener('handscope:gaze', function (e) {
        var d = e.detail;
        if (d.faceDetected && d.x != null) {
          gazePoint = { x: d.x, y: d.y };
          gazeDotEl.style.left = d.x + 'px';
          gazeDotEl.style.top = d.y + 'px';
          gazeDotEl.classList.add('hb-visible');
          gazeStatusEl.textContent = 'GZ:browser';
          gazeStatusEl.className = 'gs-ok';
          gazeEnabled = true;
        } else {
          gazeDotEl.classList.remove('hb-visible');
          gazeStatusEl.textContent = 'GZ:no-face';
          gazeStatusEl.className = 'gs-init';
          gazeEnabled = false;
        }
      });
    }

    let modelProcessing = false;
    let modelResults = null;
    let prevTickAt = 0;
    let lastHandSeenAt = 0;
    let lastIdleDetectAt = 0;
    let handFrameSkip = false;

    async function detectLoop() {
      const now = performance.now();
      // Readout = app tick rate (smoothness), not model run rate.
      if (prevTickAt > 0) {
        const instFps = 1000 / Math.max(now - prevTickAt, 1);
        fpsSmooth = fpsSmooth ? fpsSmooth * 0.9 + instFps * 0.1 : instFps;
        setTextOnce(fpsEl, String(Math.round(fpsSmooth)));
      }
      prevTickAt = now;
      const handIdle = now - lastHandSeenAt > HAND_LOST_GRACE_MS;
      let shouldDetect = false;
      if (video.readyState >= 2 && handLandmarker && !modelProcessing) {
        if (handIdle) {
          shouldDetect = now - lastIdleDetectAt >= IDLE_DETECT_GAP_MS;
        } else {
          // Full-rate inference (~28 ms/frame) caps the app at ~15 FPS with a
          // hand in view. Alternating detection every other tick halves that
          // load; OneEuro smoothing covers the ~12 Hz sample rate and the
          // previous landmarks are re-processed on skipped ticks so the
          // pointer keeps moving at full tick rate.
          handFrameSkip = !handFrameSkip;
          shouldDetect = !handFrameSkip;
        }
      }
      if (shouldDetect) {
        modelProcessing = true;
        try {
          modelResults = await handLandmarker.detectForVideo(video, now);
          if (modelResults && modelResults.landmarks && modelResults.landmarks.length > 0) {
            lastHandSeenAt = now;
          } else if (handIdle) {
            lastIdleDetectAt = now;
          }
          processFrame(modelResults);
        } catch (e) {
          console.warn('detectForVideo error:', e);
        }
        modelProcessing = false;
      } else if (modelProcessing) {
        // Do not feed predictions back through the filters while inference is
        // pending; doing so turns one observed frame into cumulative drift.
      } else {
        processFrame(modelResults);
      }
      detectLoopId = requestAnimationFrame(detectLoop);
    }
    detectLoop();
  }

  window.HandScope = {
    start: init,
    stop() {
      started = false;
      clearTimeout(backendRetryTimer);
      backendRetryTimer = null;
      if (backendWs) backendWs.close();
      backendWs = null;
      stopBrowserTracking();
      endAnyDrag();
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(function (track) { track.stop(); });
        video.srcObject = null;
      }
      gazePoint = null;
      gazeEnabled = false;
      gazeDotEl.classList.remove('hb-visible');
      gestureEl.textContent = '—';
      gazeStatusEl.textContent = '';
      window.dispatchEvent(new CustomEvent('handscope:camera-stopped'));
      emitStatus({ handDetected: false, gesture: null, cameraOn: false, source: '' });
    },
    get running() { return started; },
    setSensitivity(marginX, marginY) {
      if (typeof marginX === 'number') ACTIVE_MARGIN_X = clamp(marginX, 0, 0.4);
      if (typeof marginY === 'number') ACTIVE_MARGIN_Y = clamp(marginY, 0, 0.4);
      sendBackendConfig({ marginX: ACTIVE_MARGIN_X, marginY: ACTIVE_MARGIN_Y });
    },
    getSensitivity() {
      return { marginX: ACTIVE_MARGIN_X, marginY: ACTIVE_MARGIN_Y };
    },
    setPinchThresholds(enterRatio, exitRatio) {
      if (typeof enterRatio === 'number') PINCH_ENTER_RATIO = clamp(enterRatio, 0.15, 0.9);
      if (typeof exitRatio === 'number') PINCH_EXIT_RATIO = clamp(Math.max(exitRatio, PINCH_ENTER_RATIO + 0.02), 0.17, 1);
      sendBackendConfig({}, { enter: PINCH_ENTER_RATIO, exit: PINCH_EXIT_RATIO });
    },
    getPinchThresholds() {
      return { enter: PINCH_ENTER_RATIO, exit: PINCH_EXIT_RATIO };
    },
  };

  // Nếu có giao diện shell (đặt cờ này TRƯỚC khi nạp file này), việc bật
  // camera sẽ chờ người dùng bấm "Khởi động phiên" thay vì tự chạy — đúng
  // thời điểm trình duyệt nên xin quyền camera. Nếu không có cờ này (không
  // có handscope-shell.js), tự khởi động như trước.
  if (!window.HAND_SCOPE_MANUAL_START) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
