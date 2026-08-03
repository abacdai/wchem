(function () {
  'use strict';

  if (!window.HANDSCOPE_ENABLE_GAZE) return;

  var MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';
  var CALIBRATION_KEY = 'handscope:gaze-calibration:v1';
  // Gaze pointing is smoothed downstream (0.18 lerp) and does not need a full
  // MediaPipe face inference every rAF tick. Capping at ~15 Hz keeps the main
  // thread free for the hand model + sim render; ~12 FPS with both active
  // rises to ~20+ because per-tick cost drops to one model.
  var MIN_GAZE_GAP_MS = 66;
  var lastDetectAt = 0;
  var faceLandmarker = null;
  var video = null;
  var loopId = null;
  var processing = false;
  var lastVideoTime = -1;
  var calibration = loadCalibration();
  var pendingCapture = null;
  var smoothX = null;
  var smoothY = null;
  var lastPupilPromise = null;
  var lastPupilResult = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function loadCalibration() {
    try {
      var value = JSON.parse(localStorage.getItem(CALIBRATION_KEY));
      return value && value.x && value.y ? value : null;
    } catch (error) {
      return null;
    }
  }

  function eyeRatio(landmarks, irisIndex, cornerA, cornerB, lidA, lidB) {
    var iris = landmarks[irisIndex];
    var left = landmarks[cornerA];
    var right = landmarks[cornerB];
    var top = landmarks[lidA];
    var bottom = landmarks[lidB];
    if (!iris || !left || !right || !top || !bottom) return null;

    var minX = Math.min(left.x, right.x);
    var maxX = Math.max(left.x, right.x);
    var minY = Math.min(top.y, bottom.y);
    var maxY = Math.max(top.y, bottom.y);
    return {
      x: (iris.x - minX) / Math.max(maxX - minX, 0.0001),
      y: (iris.y - minY) / Math.max(maxY - minY, 0.0001),
    };
  }

  function extractFeatures(landmarks) {
    var left = eyeRatio(landmarks, 468, 33, 133, 159, 145);
    var right = eyeRatio(landmarks, 473, 362, 263, 386, 374);
    var nose = landmarks[1];
    var faceLeft = landmarks[234];
    var faceRight = landmarks[454];
    var faceTop = landmarks[10];
    var faceBottom = landmarks[152];
    if (!left || !right || !nose || !faceLeft || !faceRight || !faceTop || !faceBottom) return null;

    return [
      1,
      (left.x + right.x) / 2,
      (left.y + right.y) / 2,
      (nose.x - faceLeft.x) / Math.max(faceRight.x - faceLeft.x, 0.0001),
      (nose.y - faceTop.y) / Math.max(faceBottom.y - faceTop.y, 0.0001),
    ];
  }

  // Same shape as extractFeatures() but the eye feature pair comes from the
  // Orlosky geometric pupil detector (see gaze-pupil.js) when it has
  // produced a result for this frame. Returns null if the precise detector
  // has not reported yet — caller should then fall back to extractFeatures().
  function extractPupilFeatures(landmarks, pupil) {
    if (!pupil) return null;
    var nose = landmarks[1];
    var faceLeft = landmarks[234];
    var faceRight = landmarks[454];
    var faceTop = landmarks[10];
    var faceBottom = landmarks[152];
    if (!nose || !faceLeft || !faceRight || !faceTop || !faceBottom) return null;

    return [
      1,
      clamp(pupil.x, 0, 1),
      clamp(pupil.y, 0, 1),
      (nose.x - faceLeft.x) / Math.max(faceRight.x - faceLeft.x, 0.0001),
      (nose.y - faceTop.y) / Math.max(faceBottom.y - faceTop.y, 0.0001),
    ];
  }

  function solve(matrix, vector) {
    var size = vector.length;
    var rows = matrix.map(function (row, index) { return row.slice().concat(vector[index]); });
    for (var column = 0; column < size; column += 1) {
      var pivot = column;
      for (var row = column + 1; row < size; row += 1) {
        if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
      }
      if (Math.abs(rows[pivot][column]) < 0.0000001) return null;
      var swap = rows[column];
      rows[column] = rows[pivot];
      rows[pivot] = swap;
      var divisor = rows[column][column];
      for (var cell = column; cell <= size; cell += 1) rows[column][cell] /= divisor;
      for (row = 0; row < size; row += 1) {
        if (row === column) continue;
        var factor = rows[row][column];
        for (cell = column; cell <= size; cell += 1) rows[row][cell] -= factor * rows[column][cell];
      }
    }
    return rows.map(function (row) { return row[size]; });
  }

  function fit(samples, targetKey) {
    var featureCount = samples[0].features.length;
    var normal = Array.from({ length: featureCount }, function () { return Array(featureCount).fill(0); });
    var target = Array(featureCount).fill(0);
    samples.forEach(function (sample) {
      for (var i = 0; i < featureCount; i += 1) {
        target[i] += sample.features[i] * sample[targetKey];
        for (var j = 0; j < featureCount; j += 1) normal[i][j] += sample.features[i] * sample.features[j];
      }
    });
    for (var diagonal = 0; diagonal < featureCount; diagonal += 1) normal[diagonal][diagonal] += 0.0001;
    return solve(normal, target);
  }

  function dot(a, b) {
    return a.reduce(function (sum, value, index) { return sum + value * b[index]; }, 0);
  }

  function emit(detail) {
    window.dispatchEvent(new CustomEvent('handscope:gaze', { detail: detail }));
  }

  function processLandmarks(landmarks) {
    // Orlosky path: if GazePupil is ready and has reported a result
    // for this frame, use precise pupil-center features instead of the
    // MediaPipe iris ratio.
    if (window.GazePupil && lastPupilResult) {
      var preciseFeatures = extractPupilFeatures(landmarks, lastPupilResult);
      if (preciseFeatures) {
        finishFrame(landmarks, preciseFeatures, 'ellipse');
        return;
      }
    }

    // Fallback: MediaPipe iris-ratio path (always works).
    var features = extractFeatures(landmarks);
    if (!features) return;
    finishFrame(landmarks, features, 'landmark');
  }

  function finishFrame(landmarks, features, method) {
    if (pendingCapture) {
      pendingCapture.features.push(features);
      if (pendingCapture.features.length >= pendingCapture.count) {
        var capture = pendingCapture;
        pendingCapture = null;
        var average = features.map(function (_, featureIndex) {
          return capture.features.reduce(function (sum, values) { return sum + values[featureIndex]; }, 0) / capture.features.length;
        });
        capture.resolve(average);
      }
    }

    if (!calibration) {
      emit({ faceDetected: true, calibrated: false, pupilMethod: method });
      return;
    }

    var normalizedX = clamp(dot(calibration.x, features), 0, 1);
    var normalizedY = clamp(dot(calibration.y, features), 0, 1);
    var nextX = normalizedX * window.innerWidth;
    var nextY = normalizedY * window.innerHeight;
    smoothX = smoothX == null ? nextX : smoothX + (nextX - smoothX) * 0.18;
    smoothY = smoothY == null ? nextY : smoothY + (nextY - smoothY) * 0.18;
    emit({ x: smoothX, y: smoothY, faceDetected: true, calibrated: true, pupilMethod: method });
  }

  function detectFrame() {
    if (!faceLandmarker || !video || video.readyState < 2) return;
    if (video.currentTime === lastVideoTime || processing) return;
    var now = performance.now();
    if (now - lastDetectAt < MIN_GAZE_GAP_MS) return;
    lastDetectAt = now;
    lastVideoTime = video.currentTime;
    processing = true;
    try {
      var result = faceLandmarker.detectForVideo(video, performance.now());
      if (result && typeof result.then === 'function') {
        result.then(handleResult).catch(handleError);
        return;
      }
      handleResult(result);
    } catch (error) {
      handleError(error);
    }
  }

  function handleResult(result) {
    processing = false;
    if (result && result.faceLandmarks && result.faceLandmarks.length) {
      processLandmarks(result.faceLandmarks[0]);
      // Kick off the Orlosky geometric detector asynchronously (lazy-loads
      // OpenCV.js on first call).  Once the Promise resolves the result is
      // stored in `lastPupilResult` and consumed on the next frame that calls
      // processLandmarks().
      if (window.GazePupil && window.GazePupil.isReady()) {
        var v = video;
        lastPupilPromise = window.GazePupil
          .computePupilOffsets(v, result.faceLandmarks[0])
          .then(function (r) {
            lastPupilResult = r;
            return r;
          });
      }
    } else {
      lastPupilResult = null;
      emit({ faceDetected: false, calibrated: Boolean(calibration) });
    }
  }

  function handleError() {
    processing = false;
  }

  function frameLoop() {
    detectFrame();
    loopId = requestAnimationFrame(frameLoop);
  }

  async function start() {
    if (faceLandmarker) return;
    video = document.getElementById('hb-video');
    if (!video || video.readyState < 2) {
      setTimeout(start, 200);
      return;
    }
    try {
      var module = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs');
      var vision = await module.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );
      faceLandmarker = await module.FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: window.HANDSCOPE_GPU_DELEGATE === false ? 'CPU' : 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
      emit({ ready: true, faceDetected: false, calibrated: Boolean(calibration) });
      frameLoop();
    } catch (error) {
      console.warn('[Gaze] Không thể tải mô hình theo dõi mắt:', error);
      emit({ error: 'Không thể tải mô hình theo dõi mắt.' });
    }
  }

  function stop() {
    if (loopId) cancelAnimationFrame(loopId);
    loopId = null;
    processing = false;
    smoothX = null;
    smoothY = null;
    if (pendingCapture) pendingCapture.reject(new Error('Calibration stopped'));
    pendingCapture = null;
    if (faceLandmarker && typeof faceLandmarker.close === 'function') faceLandmarker.close();
    faceLandmarker = null;
    emit({ stopped: true, faceDetected: false, calibrated: Boolean(calibration) });
  }

  window.GazeTracker = {
    start: start,
    stop: stop,
    get calibrated() { return Boolean(calibration); },
    capturePoint: function (x, y) {
      if (!faceLandmarker) return Promise.reject(new Error('Eye tracker is not ready'));
      if (pendingCapture) return Promise.reject(new Error('A calibration point is already being captured'));
      return new Promise(function (resolve, reject) {
        pendingCapture = { x: x, y: y, count: 18, features: [], resolve: resolve, reject: reject };
      });
    },
    saveCalibration: function (samples) {
      if (!samples || samples.length < 5) throw new Error('Not enough calibration points');
      var xWeights = fit(samples, 'x');
      var yWeights = fit(samples, 'y');
      if (!xWeights || !yWeights) throw new Error('Calibration could not be solved');
      calibration = { x: xWeights, y: yWeights };
      localStorage.setItem(CALIBRATION_KEY, JSON.stringify(calibration));
      smoothX = null;
      smoothY = null;
      emit({ calibrated: true, faceDetected: true });
    },
    resetCalibration: function () {
      calibration = null;
      localStorage.removeItem(CALIBRATION_KEY);
      smoothX = null;
      smoothY = null;
      emit({ calibrated: false, faceDetected: true });
    },
  };

  window.addEventListener('handscope:camera-started', start);
  window.addEventListener('handscope:camera-stopped', stop);
})();
