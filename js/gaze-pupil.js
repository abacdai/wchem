/* =========================================================
   gaze-pupil.js
   -----------------------------------------------------------
   Bridge between MediaPipe Face Landmarker (normalized [0..1]
   landmarks) and the Orlosky geometric pupil detector
   (`js/pupil-detector.js`).

   Why this exists:
   - `pupil-detector.js` was ported to assume a CLOSE-UP image
     of an eye (IR / VR glasses), not a full webcam frame.
   - This module crops one or both eye ROIs using the face
     landmarker we already loaded in `gaze.js`, draws each ROI
     on an offscreen canvas, hands the resulting `cv.Mat` to
     `PupilDetector.detectPupil(...)`, and reports a normalized
     pupil offset (0..1 inside the eye box) back to the caller.
   - The caller (gaze.js) can then feed that offset into the
     same calibration pipeline already used for iris-ratio
     features — replacing the noisy MediaPipe iris ratio with
     a precise geometric pupil center, which is what the user
     asked for ("accurately target and display the point the
     eye is looking at").

   OpenCV.js is loaded ON LAZY DEMAND only — first call to
   `computePupilOffsets()` triggers `loadOpenCv()` if it has
   not already resolved. While OpenCV is loading, `compute-
   PupilOffsets()` returns `null` and the caller falls back to
   the iris-ratio path.
   ========================================================= */
(function () {
  'use strict';

  var OPENCV_URL = 'https://docs.opencv.org/4.x/opencv.js';
  var EYE_BOX_PADDING = 0.35;   // 35% padding around the eye corners
  var EYE_BOX_MIN_PX = 80;      // minimum crop side in pixels
  var EYE_BOX_MAX_PX = 320;     // maximum crop side in pixels
  var PUPIL_TARGET = 160;       // square px we feed detectPupil at
  var MAX_FPS = 30;
  var MIN_FRAME_GAP_MS = 1000 / MAX_FPS;

  // MediaPipe Face Mesh landmark indices we need.
  // Right eye (subject's right, screen left when facing camera).
  var RIGHT_EYE = { cornerL: 33, cornerR: 133, lidTop: 159, lidBot: 145, iris: 468 };
  // Left eye (subject's left, screen right).
  var LEFT_EYE  = { cornerL: 263, cornerR: 362, lidTop: 386, lidBot: 374, iris: 473 };

  var openCvReady = null;       // Promise<boolean>
  var cropCanvas = null;
  var cropCtx = null;
  var lastRunAt = 0;

  function loadOpenCv() {
    if (openCvReady) return openCvReady;
    openCvReady = new Promise(function (resolve) {
      if (typeof window.cv !== 'undefined' && window.cv && window.cv.Mat) {
        resolve(true);
        return;
      }
      var existing = document.getElementById('wchem-opencv-script');
      if (existing) {
        existing.addEventListener('load', function () { resolve(true); });
        existing.addEventListener('error', function () { resolve(false); });
        return;
      }
      var s = document.createElement('script');
      s.id = 'wchem-opencv-script';
      s.src = OPENCV_URL;
      s.async = true;
      s.onload = function () {
        // OpenCV.js exposes `cv` with an `onRuntimeInitialized` hook.
        if (window.cv && typeof window.cv.onRuntimeInitialized !== 'undefined') {
          var prev = window.cv.onRuntimeInitialized;
          window.cv.onRuntimeInitialized = function () {
            try { if (typeof prev === 'function') prev(); } catch (e) {}
            resolve(true);
          };
        } else {
          resolve(false);
        }
      };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
    return openCvReady;
  }

  function ensureCanvas() {
    if (cropCanvas) return;
    cropCanvas = document.createElement('canvas');
    cropCtx = cropCanvas.getContext('2d', { willReadFrequently: false });
  }

  function pickEye(landmarks, eye, videoW, videoH) {
    var a = landmarks[eye.cornerL];
    var b = landmarks[eye.cornerR];
    var t = landmarks[eye.lidTop];
    var bo = landmarks[eye.lidBot];
    var iris = landmarks[eye.iris];
    if (!a || !b || !t || !bo || !iris) return null;

    var minX = Math.min(a.x, b.x, t.x, bo.x, iris.x);
    var maxX = Math.max(a.x, b.x, t.x, bo.x, iris.x);
    var minY = Math.min(a.y, b.y, t.y, bo.y, iris.y);
    var maxY = Math.max(a.y, b.y, t.y, bo.y, iris.y);

    var w = maxX - minX;
    var h = maxY - minY;
    var side = Math.max(w, h) * (1 + 2 * EYE_BOX_PADDING);

    var cx = (minX + maxX) / 2;
    var cy = (minY + maxY) / 2;

    var minSidePx = EYE_BOX_MIN_PX / Math.max(videoW, videoH);
    var maxSidePx = EYE_BOX_MAX_PX / Math.max(videoW, videoH);
    if (side < minSidePx) side = minSidePx;
    if (side > maxSidePx) side = maxSidePx;

    var half = side / 2;
    var nx0 = cx - half, ny0 = cy - half;
    var nx1 = cx + half, ny1 = cy + half;

    if (nx0 < 0) { nx1 -= nx0; nx0 = 0; }
    if (ny0 < 0) { ny1 -= ny0; ny0 = 0; }
    if (nx1 > 1) { nx0 -= (nx1 - 1); nx1 = 1; }
    if (ny1 > 1) { ny0 -= (ny1 - 1); ny1 = 1; }
    nx0 = Math.max(0, nx0); ny0 = Math.max(0, ny0);
    nx1 = Math.min(1, nx1); ny1 = Math.min(1, ny1);

    return {
      sx: nx0 * videoW, sy: ny0 * videoH,
      sw: (nx1 - nx0) * videoW, sh: (ny1 - ny0) * videoH,
      // Iris center inside the crop (normalized 0..1).
      irisX: (iris.x - nx0) / Math.max(nx1 - nx0, 0.0001),
      irisY: (iris.y - ny0) / Math.max(ny1 - ny0, 0.0001),
    };
  }

  function detectOnCrop(video, box) {
    if (!window.cv || !window.cv.Mat) return null;
    ensureCanvas();
    var target = PUPIL_TARGET;
    cropCanvas.width = target;
    cropCanvas.height = target;
    cropCtx.drawImage(video, box.sx, box.sy, box.sw, box.sh, 0, 0, target, target);

    var src = window.cv.imread(cropCanvas);
    var res = null;
    try {
      res = window.PupilDetector.detectPupil(window.cv, src, { width: target, height: target });
    } catch (err) {
      // Defensive: never let a CV error break the gaze loop.
      console.warn('[gaze-pupil] detectPupil failed:', err);
      res = null;
    }
    src.delete();
    if (!res) return null;
    return {
      x: res.center.x / target,
      y: res.center.y / target,
      sizeW: res.size.width / target,
      sizeH: res.size.height / target,
      irisX: box.irisX,
      irisY: box.irisY,
    };
  }

  /**
   * Compute pupil offsets for one frame.
   * @param {HTMLVideoElement} video
   * @param {Array} landmarks    MediaPipe Face Landmarker normalized landmarks.
   * @returns {Promise<{x:number,y:number,method:'ellipse'}|null>}
   *          Normalized (0..1) gaze target within the eye crop, or null
   *          if OpenCV is not ready / no pupil was found.
   */
  function computePupilOffsets(video, landmarks) {
    if (!video || !landmarks) return Promise.resolve(null);
    var now = performance.now();
    if (now - lastRunAt < MIN_FRAME_GAP_MS) return Promise.resolve(null);
    lastRunAt = now;

    return loadOpenCv().then(function (ready) {
      if (!ready || !window.cv || !window.cv.Mat) return null;
      var videoW = video.videoWidth, videoH = video.videoHeight;
      if (!videoW || !videoH) return null;

      var right = pickEye(landmarks, RIGHT_EYE, videoW, videoH);
      var left  = pickEye(landmarks, LEFT_EYE,  videoW, videoH);
      // Try right first (usually larger / better lit for the right-handed majority).
      var r = right ? detectOnCrop(video, right) : null;
      var l = !r && left ? detectOnCrop(video, left) : null;
      var pick = r || l;
      if (!pick) return null;
      return { x: pick.x, y: pick.y, method: 'ellipse' };
    });
  }

  function isReady() {
    return typeof window.PupilDetector !== 'undefined';
  }

  window.GazePupil = {
    computePupilOffsets: computePupilOffsets,
    loadOpenCv: loadOpenCv,
    isReady: isReady,
  };
})();
