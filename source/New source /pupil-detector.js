/* =========================================================
   pupil-detector.js
   -----------------------------------------------------------
   Cổng JS trung thực của OrloskyPupilDetector.py
   (nguồn: JEOresearch/EyeTracker, giấy phép MIT).

   Dùng OpenCV.js — CÙNG thư viện lõi C++ OpenCV như bản Python
   (opencv-python), chỉ khác lớp bọc ngôn ngữ, nên cùng tham số
   sẽ cho kết quả tương đương pixel-cho-pixel với bản gốc.

   Các hàm được đặt tên và giữ cấu trúc song song với file .py
   gốc để dễ đối chiếu từng dòng. Có 2 khác biệt CÓ CHỦ ĐÍCH,
   ghi rõ tại chỗ xảy ra:
     1. Gộp việc chuyển ảnh xám (chỉ làm 1 lần thay vì 2 lần
        như bản gốc) — không đổi kết quả, chỉ đỡ tính lại.
     2. Khi không tìm được ellipse hợp lệ, trả về `null` thay vì
        rotated-rect toàn số 0 — an toàn hơn cho code gọi ở JS.
   Không có khác biệt nào về thuật toán/tham số xử lý ảnh.
   ========================================================= */
(function (global) {
  'use strict';

  /* ---------- crop_to_aspect_ratio ---------- */
  function cropToAspectRatio(cv, srcMat, width, height) {
    width = width || 640;
    height = height || 480;
    const w = srcMat.cols, h = srcMat.rows;
    const desiredRatio = width / height;
    const currentRatio = w / h;
    let roi;
    if (currentRatio > desiredRatio) {
      const newWidth = Math.round(desiredRatio * h);
      const offset = Math.floor((w - newWidth) / 2);
      roi = srcMat.roi(new cv.Rect(offset, 0, newWidth, h));
    } else {
      const newHeight = Math.round(w / desiredRatio);
      const offset = Math.floor((h - newHeight) / 2);
      roi = srcMat.roi(new cv.Rect(0, offset, w, newHeight));
    }
    const resized = new cv.Mat();
    cv.resize(roi, resized, new cv.Size(width, height), 0, 0, cv.INTER_LINEAR);
    roi.delete();
    return resized;
  }

  /* ---------- apply_binary_threshold ---------- */
  function applyBinaryThreshold(cv, grayMat, darkestPixelValue, addedThreshold) {
    const threshold = darkestPixelValue + addedThreshold;
    const dst = new cv.Mat();
    cv.threshold(grayMat, dst, threshold, 255, cv.THRESH_BINARY_INV);
    return dst;
  }

  /* ---------- get_darkest_area ----------
     Quét thưa (sparse sampling) y hệt bản gốc: bỏ qua viền
     ignoreBounds px, kiểm tra khối searchArea mỗi imageSkipSize
     px, và trong mỗi khối chỉ lấy mẫu mỗi internalSkipSize px. */
  function getDarkestArea(grayMat) {
    const ignoreBounds = 20;
    const imageSkipSize = 10;
    const searchArea = 20;
    const internalSkipSize = 5;

    const data = grayMat.data; // Uint8Array, 1 kênh, hàng-chính (row-major)
    const cols = grayMat.cols;
    const rows = grayMat.rows;

    let minSum = Infinity;
    let darkestPoint = null;

    for (let y = ignoreBounds; y < rows - ignoreBounds; y += imageSkipSize) {
      for (let x = ignoreBounds; x < cols - ignoreBounds; x += imageSkipSize) {
        let currentSum = 0;
        let numPixels = 0;
        for (let dy = 0; dy < searchArea; dy += internalSkipSize) {
          if (y + dy >= rows) break;
          const rowOffset = (y + dy) * cols;
          for (let dx = 0; dx < searchArea; dx += internalSkipSize) {
            if (x + dx >= cols) break;
            currentSum += data[rowOffset + x + dx];
            numPixels += 1;
          }
        }
        if (currentSum < minSum && numPixels > 0) {
          minSum = currentSum;
          darkestPoint = { x: x + Math.floor(searchArea / 2), y: y + Math.floor(searchArea / 2) };
        }
      }
    }
    return darkestPoint;
  }

  /* ---------- mask_outside_square ---------- */
  function maskOutsideSquare(cv, binMat, center, size) {
    const halfSize = Math.floor(size / 2);
    const mask = cv.Mat.zeros(binMat.rows, binMat.cols, binMat.type());
    const topLeftX = Math.max(0, center.x - halfSize);
    const topLeftY = Math.max(0, center.y - halfSize);
    const brX = Math.min(binMat.cols, center.x + halfSize);
    const brY = Math.min(binMat.rows, center.y + halfSize);
    cv.rectangle(mask, new cv.Point(topLeftX, topLeftY), new cv.Point(brX, brY), new cv.Scalar(255), -1);
    const dst = new cv.Mat();
    cv.bitwise_and(binMat, mask, dst);
    mask.delete();
    return dst;
  }

  /* ---------- tiện ích Mat <-> mảng điểm ---------- */
  function matToPointArray(contourMat) {
    const pts = [];
    const data = contourMat.data32S; // Int32Array xen kẽ x,y,x,y,...
    for (let i = 0; i < data.length; i += 2) {
      pts.push({ x: data[i], y: data[i + 1] });
    }
    return pts;
  }
  function pointArrayToMat(cv, pts) {
    const mat = new cv.Mat(pts.length, 1, cv.CV_32SC2);
    const data = mat.data32S;
    for (let i = 0; i < pts.length; i += 1) {
      data[i * 2] = Math.round(pts[i].x);
      data[i * 2 + 1] = Math.round(pts[i].y);
    }
    return mat;
  }
  function drawRotatedEllipse(cv, mat, rr, color, thickness) {
    cv.ellipse(
      mat,
      new cv.Point(rr.center.x, rr.center.y),
      new cv.Size(rr.size.width / 2, rr.size.height / 2),
      rr.angle, 0, 360, color, thickness,
    );
  }

  /* ---------- filter_contours_by_area_and_return_largest ----------
     Trả về CHỈ SỐ (index) trong MatVector, không trả Mat trực tiếp,
     để tránh giữ tham chiếu tới Mat đã .delete() ở nơi khác. */
  function filterContoursByAreaAndReturnLargest(cv, contours, pixelThresh, ratioThresh) {
    let maxArea = 0;
    let largestIdx = -1;
    for (let i = 0; i < contours.size(); i += 1) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour, false);
      if (area >= pixelThresh) {
        const rect = cv.boundingRect(contour);
        const length = Math.max(rect.width, rect.height);
        const width = Math.min(rect.width, rect.height) || 1;
        const currentRatio = Math.max(length / width, width / length);
        if (currentRatio <= ratioThresh && area > maxArea) {
          maxArea = area;
          largestIdx = i;
        }
      }
      contour.delete();
    }
    return largestIdx;
  }

  /* ---------- check_contour_pixels ---------- */
  function checkContourPixels(cv, contour, rows, cols) {
    if (contour.rows < 5) return { thick: 0, ratio: 0 };

    const contourMask = cv.Mat.zeros(rows, cols, cv.CV_8UC1);
    const contourVec = new cv.MatVector();
    contourVec.push_back(contour);
    cv.drawContours(contourMask, contourVec, -1, new cv.Scalar(255), 1);
    contourVec.delete();

    const ellipse = cv.fitEllipse(contour);
    const maskThick = cv.Mat.zeros(rows, cols, cv.CV_8UC1);
    const maskThin = cv.Mat.zeros(rows, cols, cv.CV_8UC1);
    drawRotatedEllipse(cv, maskThick, ellipse, new cv.Scalar(255), 10); // bắt nhiều hơn, cho absolute
    drawRotatedEllipse(cv, maskThin, ellipse, new cv.Scalar(255), 4);  // bắt ít hơn, cho ratio

    const overlapThick = new cv.Mat();
    const overlapThin = new cv.Mat();
    cv.bitwise_and(contourMask, maskThick, overlapThick);
    cv.bitwise_and(contourMask, maskThin, overlapThin);

    const absThick = cv.countNonZero(overlapThick);
    const absThin = cv.countNonZero(overlapThin);
    const totalBorder = cv.countNonZero(contourMask);
    const ratio = totalBorder > 0 ? absThin / totalBorder : 0;

    contourMask.delete(); maskThick.delete(); maskThin.delete();
    overlapThick.delete(); overlapThin.delete();

    return { thick: absThick, ratio };
  }

  /* ---------- check_ellipse_goodness ---------- */
  function checkEllipseGoodness(cv, binaryMat, contour) {
    if (contour.rows < 5) return { filled: 0, skew: 0 };
    const ellipse = cv.fitEllipse(contour);
    const mask = cv.Mat.zeros(binaryMat.rows, binaryMat.cols, cv.CV_8UC1);
    drawRotatedEllipse(cv, mask, ellipse, new cv.Scalar(255), -1); // tô đặc

    const ellipseArea = cv.countNonZero(mask);
    if (ellipseArea === 0) { mask.delete(); return { filled: 0, skew: 0 }; }

    const covered = new cv.Mat();
    cv.bitwise_and(binaryMat, mask, covered);
    const coveredCount = cv.countNonZero(covered);
    covered.delete();
    mask.delete();

    const filled = coveredCount / ellipseArea;
    const w = ellipse.size.width, h = ellipse.size.height;
    const skew = w > 0 && h > 0 ? Math.min(h / w, w / h) : 0;
    return { filled, skew };
  }

  /* ---------- optimize_contours_by_angle ----------
     Giữ NGUYÊN phép so sánh dot-product chưa chuẩn hóa với
     cos(60°) như bản gốc (kể cả khi điều đó không phải một phép
     so sánh góc "đúng chuẩn" về mặt toán học) — mục tiêu là tái
     tạo đúng hành vi quan sát được của thuật toán gốc, không
     phải một phiên bản "sửa cho đúng toán học". Dòng tính `angle`
     bằng arccos trong bản gốc không được dùng ở đâu cả nên được
     bỏ qua (không ảnh hưởng kết quả). */
  function optimizeContoursByAngle(pts) {
    const n = pts.length;
    if (n < 1) return pts;

    const spacing = Math.max(1, Math.floor(n / 25));
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i += 1) { cx += pts[i].x; cy += pts[i].y; }
    cx /= n; cy /= n;

    const cosThreshold = Math.cos((60 * Math.PI) / 180);
    const filtered = [];
    const wrap = (idx) => ((idx % n) + n) % n;

    for (let i = 0; i < n; i += 1) {
      const cur = pts[i];
      const prevIdx = i - spacing >= 0 ? i - spacing : n - spacing;
      const nextIdx = i + spacing < n ? i + spacing : spacing;
      const prev = pts[wrap(prevIdx)];
      const next = pts[wrap(nextIdx)];

      const vec1x = prev.x - cur.x, vec1y = prev.y - cur.y;
      const vec2x = next.x - cur.x, vec2y = next.y - cur.y;
      const avgX = (vec1x + vec2x) / 2, avgY = (vec1y + vec2y) / 2;
      const toCentroidX = cx - cur.x, toCentroidY = cy - cur.y;
      const dot = toCentroidX * avgX + toCentroidY * avgY;

      if (dot >= cosThreshold) filtered.push(cur);
    }
    return filtered;
  }

  /* ---------- process_frames ----------
     Chạy 3 mức ngưỡng (chặt/vừa/lỏng), chọn mức cho "độ tốt"
     ellipse cao nhất, rồi lọc góc + fit ellipse cuối cùng. */
  function processFrames(cv, threshStrict, threshMedium, threshRelaxed) {
    const imageArray = [threshRelaxed, threshMedium, threshStrict];
    const kernel = cv.Mat.ones(5, 5, cv.CV_8U);

    let bestGoodness = 0;
    let bestPoints = null;

    for (let i = 0; i < 3; i += 1) {
      const dilated = new cv.Mat();
      cv.dilate(imageArray[i], dilated, kernel, new cv.Point(-1, -1), 2, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      const bestIdx = filterContoursByAreaAndReturnLargest(cv, contours, 1000, 3);
      if (bestIdx >= 0) {
        const contour = contours.get(bestIdx);
        if (contour.rows > 5) {
          const goodnessInfo = checkEllipseGoodness(cv, dilated, contour);
          const pixelInfo = checkContourPixels(cv, contour, dilated.rows, dilated.cols);
          const finalGoodness = goodnessInfo.filled * pixelInfo.thick * pixelInfo.thick * pixelInfo.ratio;

          if (finalGoodness > 0 && finalGoodness > bestGoodness) {
            bestGoodness = finalGoodness;
            bestPoints = matToPointArray(contour);
          }
        }
        contour.delete();
      }

      dilated.delete();
      contours.delete();
      hierarchy.delete();
    }
    kernel.delete();

    if (!bestPoints) return null;

    const optimizedPoints = optimizeContoursByAngle(bestPoints);
    if (optimizedPoints.length <= 5) return null;

    const contourMat = pointArrayToMat(cv, optimizedPoints);
    const ellipse = cv.fitEllipse(contourMat);
    contourMat.delete();

    return ellipse; // { center:{x,y}, size:{width,height}, angle }
  }

  /* ---------- process_frame (điểm vào chính) ----------
     Nhận một cv.Mat ảnh màu (RGBA từ canvas, hoặc BGR/BGRA đều
     được vì chỉ dùng để chuyển xám) và trả về rotated-rect của
     pupil, hoặc null nếu không tìm được. */
  function detectPupil(cv, colorMat, opts) {
    opts = opts || {};
    const targetW = opts.width || 640;
    const targetH = opts.height || 480;
    const colorConv = opts.colorConversion != null ? opts.colorConversion : cv.COLOR_RGBA2GRAY;

    const cropped = cropToAspectRatio(cv, colorMat, targetW, targetH);
    const gray = new cv.Mat();
    cv.cvtColor(cropped, gray, colorConv);

    const darkestPoint = getDarkestArea(gray);
    if (!darkestPoint) { cropped.delete(); gray.delete(); return null; }

    const darkestPixelValue = gray.data[darkestPoint.y * gray.cols + darkestPoint.x];

    const rawStrict = applyBinaryThreshold(cv, gray, darkestPixelValue, 5);
    const strict = maskOutsideSquare(cv, rawStrict, darkestPoint, 250);
    rawStrict.delete();

    const rawMedium = applyBinaryThreshold(cv, gray, darkestPixelValue, 15);
    const medium = maskOutsideSquare(cv, rawMedium, darkestPoint, 250);
    rawMedium.delete();

    const rawRelaxed = applyBinaryThreshold(cv, gray, darkestPixelValue, 25);
    const relaxed = maskOutsideSquare(cv, rawRelaxed, darkestPoint, 250);
    rawRelaxed.delete();

    const ellipse = processFrames(cv, strict, medium, relaxed);

    strict.delete(); medium.delete(); relaxed.delete();
    gray.delete(); cropped.delete();

    if (!ellipse) return null;
    return {
      center: { x: ellipse.center.x, y: ellipse.center.y },
      size: { width: ellipse.size.width, height: ellipse.size.height },
      angle: ellipse.angle,
      darkestPoint,
      // Toạ độ trên đúng vẫn tính theo khung đã crop_to_aspect_ratio (targetW x targetH,
      // mặc định 640x480) — quy đổi lại toạ độ gốc nếu cần ở phía gọi.
      cropSize: { width: targetW, height: targetH },
    };
  }

  global.PupilDetector = {
    detectPupil,
    cropToAspectRatio,
    getDarkestArea,
  };
})(typeof window !== 'undefined' ? window : globalThis);
