import asyncio
import json
import time
import warnings

import cv2
import mediapipe as mp
import numpy as np
import websockets

warnings.filterwarnings("ignore", category=UserWarning)

# ─── One-Euro Filter ────────────────────────────────────────
class OneEuroFilter:
    def __init__(self, mincutoff=0.6, beta=0.3, dcutoff=1.0):
        self.mincutoff = mincutoff
        self.beta = beta
        self.dcutoff = dcutoff
        self.x_prev = None
        self.dx_prev = 0.0
        self.ddx_prev = 0.0
        self.t_prev = None

    @staticmethod
    def alpha(cutoff, dt):
        tau = 1.0 / (2.0 * np.pi * cutoff)
        return 1.0 / (1.0 + tau / dt) if dt > 0 else 1.0

    def filter(self, x, t_ms):
        if self.t_prev is None:
            self.t_prev = t_ms
            self.x_prev = x
            self.dx_prev = 0.0
            self.ddx_prev = 0.0
            return x
        dt = max((t_ms - self.t_prev) / 1000.0, 1.0 / 120.0)
        self.t_prev = t_ms
        dx = (x - self.x_prev) / dt
        a_d = self.alpha(self.dcutoff, dt)
        dx_hat = a_d * dx + (1.0 - a_d) * self.dx_prev
        ddx = (dx_hat - self.dx_prev) / dt
        ddx_a = self.alpha(0.3, dt)
        self.ddx_prev = ddx_a * ddx + (1.0 - ddx_a) * self.ddx_prev
        cutoff = self.mincutoff + self.beta * abs(dx_hat)
        a = self.alpha(cutoff, dt)
        x_hat = a * x + (1.0 - a) * self.x_prev
        self.x_prev = x_hat
        self.dx_prev = dx_hat
        return x_hat

    def predict(self, dt):
        if self.t_prev is None:
            return 0.0
        return self.x_prev + self.dx_prev * dt + 0.5 * self.ddx_prev * dt * dt

class FilterBank:
    def __init__(self, n=21):
        self.filters = [(OneEuroFilter(), OneEuroFilter()) for _ in range(n)]

    def filter_landmarks(self, landmarks, t_ms):
        return [
            {"x": fx.filter(lm[0], t_ms), "y": fy.filter(lm[1], t_ms), "z": lm[2]}
            for (fx, fy), lm in zip(self.filters, landmarks)
        ]

    def reset(self):
        self.__init__(len(self.filters))

# ─── Gesture Analysis ───────────────────────────────────────
def dist3(a, b):
    return np.linalg.norm(np.array(a) - np.array(b))

def analyze_hand(lm):
    wrist = lm[0]
    extended = {
        "thumb":  dist3(lm[4], wrist) > dist3(lm[2], wrist) * 1.15,
        "index":  dist3(lm[8], wrist) > dist3(lm[6], wrist) * 1.05,
        "middle": dist3(lm[12], wrist) > dist3(lm[10], wrist) * 1.05,
        "ring":   dist3(lm[16], wrist) > dist3(lm[14], wrist) * 1.05,
        "pinky":  dist3(lm[20], wrist) > dist3(lm[18], wrist) * 1.05,
    }
    extended_count = sum(extended.values())
    hand_span = dist3(lm[0], lm[9]) or 0.001
    pinch_dist = dist3(lm[4], lm[8])
    return extended, extended_count, hand_span, pinch_dist

# ─── Pinch State Machine ────────────────────────────────────
class PinchResolver:
    def __init__(self):
        self.enter_ratio = 0.38
        self.exit_ratio = 0.52
        self.state = False
        self.hold_frames = 0
        self.force_release_frames = 60
        self.pinch_dist_history = []
        self.hand_span_history = []
        self.cooldown = 0

    def resolve(self, pinch_dist, hand_span, extended):
        if self.cooldown > 0:
            self.cooldown -= 1
        self.pinch_dist_history.append(pinch_dist)
        self.hand_span_history.append(hand_span)
        if len(self.pinch_dist_history) > 15:
            self.pinch_dist_history.pop(0)
        if len(self.hand_span_history) > 15:
            self.hand_span_history.pop(0)

        avg_hand_span = sum(self.hand_span_history) / len(self.hand_span_history) if self.hand_span_history else hand_span

        if not self.state:
            if pinch_dist < avg_hand_span * self.enter_ratio and self.cooldown == 0:
                self.state = True
                self.hold_frames = 0
                self.cooldown = 3
        else:
            self.hold_frames += 1
            release_dist = avg_hand_span * self.exit_ratio
            if (pinch_dist > release_dist and self.cooldown == 0) or self.hold_frames > self.force_release_frames:
                self.state = False
                self.pinch_dist_history = []
                self.hand_span_history = []
                self.cooldown = 3
        return self.state

    def set_thresholds(self, enter, exit):
        if enter is not None:
            self.enter_ratio = max(0.15, min(0.9, enter))
        if exit is not None:
            self.exit_ratio = max(self.enter_ratio + 0.02, min(1.0, exit))

    def state_copy(self):
        p = PinchResolver()
        p.enter_ratio = self.enter_ratio
        p.exit_ratio = self.exit_ratio
        return p

# ─── Pupil Detection — Ellipse fitting (port from source/OrloskyPupilDetector.py) ──
def _darkest_point(eye_roi):
    """Find darkest pixel in ROI (pupil is darkest region)."""
    h, w = eye_roi.shape[:2]
    min_val = float('inf')
    darkest = (w // 2, h // 2)
    step = max(1, min(w, h) // 20)
    margin = 3
    for y in range(margin, h - margin, step):
        for x in range(margin, w - margin, step):
            val = int(eye_roi[y, x]) + \
                  int(eye_roi[min(y + step, h - 1), x]) + \
                  int(eye_roi[y, min(x + step, w - 1)])
            if val < min_val:
                min_val = val
                darkest = (x, y)
    return darkest

def _mask_square(roi, center, size):
    """Keep only a square region around center."""
    h, w = roi.shape[:2]
    half = size // 2
    x0 = max(0, center[0] - half)
    y0 = max(0, center[1] - half)
    x1 = min(w, center[0] + half)
    y1 = min(h, center[1] + half)
    mask = np.zeros_like(roi)
    if len(roi.shape) == 2:
        mask[y0:y1, x0:x1] = 255
    else:
        mask[y0:y1, x0:x1] = (255, 255, 255)
    return cv2.bitwise_and(roi, mask)

def _ellipse_score(thresh, contour):
    """Score an ellipse candidate: coverage ratio * contour pixel count."""
    if len(contour) < 5:
        return 0, None
    ellipse = cv2.fitEllipse(contour)
    cx, cy = map(int, ellipse[0])
    mask = np.zeros_like(thresh)
    cv2.ellipse(mask, ellipse, 255, -1)
    covered = np.sum((thresh == 255) & (mask == 255))
    total = np.sum(mask == 255)
    if total == 0:
        return 0, None
    ratio = covered / max(total, 1)
    contour_pixels = np.sum(thresh == 255)
    score = ratio * contour_pixels * contour_pixels
    return score, (cx, cy)

def _detect_pupil_ellipse(eye_roi, threshold):
    """Multi-threshold ellipse fitting pupil detector (Orlosky method)."""
    if eye_roi is None or eye_roi.size < 100:
        return None
    gray = eye_roi if len(eye_roi.shape) == 2 else cv2.cvtColor(eye_roi, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 7, 12, 12)
    kernel = np.ones((3, 3), np.uint8)
    dp = _darkest_point(gray)
    darkest_val = int(gray[dp[1], dp[0]])

    best_center = None
    best_score = 0

    offsets = [5, 15, 25]
    for offset in offsets:
        t = max(3, min(252, darkest_val + offset))
        _, thresh = cv2.threshold(gray, t, 255, cv2.THRESH_BINARY_INV)
        thresh = _mask_square(thresh, dp, 120)
        thresh = cv2.erode(thresh, kernel, iterations=1)
        thresh = cv2.dilate(thresh, kernel, iterations=2)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < 15 or area > gray.size * 0.35:
                continue
            x, y, w, h = cv2.boundingRect(cnt)
            ratio = max(w, h) / max(min(w, h), 1)
            if ratio > 4:
                continue
            if len(cnt) >= 5:
                score, center = _ellipse_score(thresh, cnt)
                if center is not None and score > best_score:
                    best_score = score
                    best_center = center
    return best_center

def _iris_size(frame):
    frame_crop = frame[5:-5, 5:-5] if frame.shape[0] > 10 and frame.shape[1] > 10 else frame
    h, w = frame_crop.shape[:2]
    if h * w == 0:
        return 0
    nb_pixels = h * w
    nb_blacks = nb_pixels - cv2.countNonZero(frame_crop)
    return nb_blacks / nb_pixels

def _find_best_threshold(eye_frame):
    average_iris_size = 0.48
    trials = {}
    for threshold in range(5, 100, 5):
        kernel = np.ones((3, 3), np.uint8)
        processed = cv2.bilateralFilter(eye_frame, 10, 15, 15)
        processed = cv2.erode(processed, kernel, iterations=3)
        _, processed = cv2.threshold(processed, threshold, 255, cv2.THRESH_BINARY)
        trials[threshold] = _iris_size(processed)
    if not trials:
        return 50
    best_threshold, _ = min(trials.items(), key=lambda p: abs(p[1] - average_iris_size))
    return best_threshold

# ─── Eye Region Extraction + Calibration ──
class EyeCalibration:
    def __init__(self, nb_frames=20):
        self.nb_frames = nb_frames
        self.thresholds_left = []
        self.thresholds_right = []

    def is_complete(self):
        return len(self.thresholds_left) >= self.nb_frames and len(self.thresholds_right) >= self.nb_frames

    def threshold(self, side):
        if side == 0 and self.thresholds_left:
            return int(sum(self.thresholds_left) / len(self.thresholds_left))
        elif side == 1 and self.thresholds_right:
            return int(sum(self.thresholds_right) / len(self.thresholds_right))
        return 50

    def evaluate(self, eye_frame, side):
        if self.is_complete():
            return
        t = _find_best_threshold(eye_frame)
        if side == 0:
            self.thresholds_left.append(t)
        elif side == 1:
            self.thresholds_right.append(t)

# ─── Head Pose Estimator ────────────────────────────────────
class HeadPoseEstimator:
    FACE_LANDMARK_INDICES = [1, 2, 152, 33, 263, 61, 291]
    FACE_3D_MODEL = np.array([
        (0.0, 0.0, 0.0),
        (0.0, -63.6, -12.5),
        (0.0, -200.0, -15.0),
        (-110.0, -90.0, -15.0),
        (110.0, -90.0, -15.0),
        (-60.0, -130.0, -10.0),
        (60.0, -130.0, -10.0),
    ], dtype=np.float64)

    def __init__(self):
        self.smooth_yaw = OneEuroFilter(mincutoff=0.3, beta=0.2)
        self.smooth_pitch = OneEuroFilter(mincutoff=0.3, beta=0.2)
        self.smooth_roll = OneEuroFilter(mincutoff=0.3, beta=0.2)
        focal_length = 640
        center = (320, 240)
        self.camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1],
        ], dtype=np.float64)
        self.dist_coeffs = np.zeros((4, 1), dtype=np.float64)

    def estimate(self, landmarks, w, h, t_ms):
        image_points = []
        for idx in self.FACE_LANDMARK_INDICES:
            lm = landmarks[idx]
            image_points.append((lm.x * w, lm.y * h))
        image_points = np.array(image_points, dtype=np.float64)
        if len(image_points) != len(self.FACE_3D_MODEL):
            return None
        _, rvec, tvec = cv2.solvePnP(
            self.FACE_3D_MODEL, image_points,
            self.camera_matrix, self.dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE,
        )
        rmat, _ = cv2.Rodrigues(rvec)
        sy = np.sqrt(rmat[0, 0] ** 2 + rmat[1, 0] ** 2)
        singular = sy < 1e-6
        if not singular:
            yaw = np.degrees(np.arctan2(rmat[1, 0], rmat[0, 0]))
            pitch = np.degrees(np.arctan2(-rmat[2, 0], sy))
            roll = np.degrees(np.arctan2(rmat[2, 1], rmat[2, 2]))
        else:
            yaw = np.degrees(np.arctan2(-rmat[1, 2], rmat[1, 1]))
            pitch = np.degrees(np.arctan2(-rmat[2, 0], sy))
            roll = 0
        return {
            "yaw": round(self.smooth_yaw.filter(yaw, t_ms), 1),
            "pitch": round(self.smooth_pitch.filter(pitch, t_ms), 1),
            "roll": round(self.smooth_roll.filter(roll, t_ms), 1),
        }

# ─── Gaze Tracker (ellipse fitting + 3D gaze vector) ──
class GazeTracker:
    LANDMARK = {
        "LEFT_EYE_OUTER": 33, "LEFT_EYE_INNER": 133,
        "LEFT_EYE_TOP": 159, "LEFT_EYE_BOTTOM": 145,
        "LEFT_IRIS": 468,
        "RIGHT_EYE_OUTER": 263, "RIGHT_EYE_INNER": 362,
        "RIGHT_EYE_TOP": 386, "RIGHT_EYE_BOTTOM": 374,
        "RIGHT_IRIS": 473,
        "NOSE_TIP": 1,
        "FACE_TOP": 10, "FACE_BOTTOM": 152,
        "FACE_LEFT": 234, "FACE_RIGHT": 454,
    }
    LEFT_EYE_CONTOUR = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
    RIGHT_EYE_CONTOUR = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]

    def __init__(self):
        self.face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.smooth_h = OneEuroFilter(mincutoff=0.3, beta=0.2)
        self.smooth_v = OneEuroFilter(mincutoff=0.3, beta=0.2)
        self.calibration = EyeCalibration(nb_frames=20)
        self.head_pose = HeadPoseEstimator()
        self.last_t = 0

    def _extract_eye_roi(self, frame, landmarks, contour_indices, margin=8):
        h, w = frame.shape[:2]
        pts = np.array([
            (int(landmarks[i].x * w), int(landmarks[i].y * h))
            for i in contour_indices
        ], dtype=np.int32)
        mask = np.full((h, w), 255, dtype=np.uint8)
        cv2.fillPoly(mask, [pts], 0)
        eye_roi = cv2.bitwise_and(frame, frame, mask=mask)
        min_x = max(0, np.min(pts[:, 0]) - margin)
        max_x = min(w, np.max(pts[:, 0]) + margin)
        min_y = max(0, np.min(pts[:, 1]) - margin)
        max_y = min(h, np.max(pts[:, 1]) + margin)
        if max_x <= min_x or max_y <= min_y:
            return None, None
        cropped = eye_roi[min_y:max_y, min_x:max_x]
        return cropped, (min_x, min_y)

    def _compute_gaze_vector(self, pupil_center, eye_center_3d, w, h):
        """Compute 3D gaze direction from pupil position relative to eye center.

        Uses the Orlosky sphere-intersection model adapted for front camera.
        eye_center_3d is the 3D eye center from FaceMesh landmarks.
        pupil_center is the 2D pupil position in pixels.
        """
        # Approximate focal length and sensor center
        fx = fy = w * 0.8
        cx, cy = w / 2, h / 2

        # Unproject pupil 2D to a ray in camera space
        px, py = pupil_center
        ray_x = (px - cx) / fx
        ray_y = (py - cy) / fy
        ray_dir = np.array([ray_x, ray_y, 1.0], dtype=np.float64)
        ray_dir /= np.linalg.norm(ray_dir)

        # Eye sphere center in camera space
        sphere_center = np.array(eye_center_3d, dtype=np.float64)

        # Ray-sphere intersection
        oc = -sphere_center
        a = np.dot(ray_dir, ray_dir)
        b = 2.0 * np.dot(oc, ray_dir)
        c = np.dot(oc, oc) - 1.0
        disc = b * b - 4 * a * c
        if disc < 0:
            return None
        t = (-b - np.sqrt(disc)) / (2.0 * a)
        if t < 0:
            t = (-b + np.sqrt(disc)) / (2.0 * a)
        if t < 0:
            return None
        hit = sphere_center + t * ray_dir
        gaze_dir = hit - sphere_center
        norm = np.linalg.norm(gaze_dir)
        if norm < 1e-8:
            return None
        gaze_dir /= norm
        return gaze_dir.tolist()

    def process(self, frame, t_ms):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb)
        if not results.multi_face_landmarks:
            return None

        lm = results.multi_face_landmarks[0].landmark
        h, w = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        l_iris = lm[self.LANDMARK['LEFT_IRIS']]
        r_iris = lm[self.LANDMARK['RIGHT_IRIS']]

        # Eye centers 3D (average of eye corner landmarks)
        l_eye_3d = np.array([
            (lm[33].x + lm[133].x) / 2,
            (lm[33].y + lm[133].y) / 2,
            (lm[33].z + lm[133].z) / 2,
        ])
        r_eye_3d = np.array([
            (lm[263].x + lm[362].x) / 2,
            (lm[263].y + lm[362].y) / 2,
            (lm[263].z + lm[362].z) / 2,
        ])

        # Extract eye ROIs and detect pupils via ellipse fitting
        l_roi, l_origin = self._extract_eye_roi(gray, lm, self.LEFT_EYE_CONTOUR)
        r_roi, r_origin = self._extract_eye_roi(gray, lm, self.RIGHT_EYE_CONTOUR)

        use_image_pupil = False
        l_pupil_center = None
        r_pupil_center = None

        if l_roi is not None and l_roi.size > 0 and l_origin is not None:
            self.calibration.evaluate(l_roi, 0)
            l_thresh = self.calibration.threshold(0)
            pc = _detect_pupil_ellipse(l_roi, l_thresh)
            if pc is not None:
                l_pupil_center = (l_origin[0] + pc[0], l_origin[1] + pc[1])
                use_image_pupil = True

        if r_roi is not None and r_roi.size > 0 and r_origin is not None:
            self.calibration.evaluate(r_roi, 1)
            r_thresh = self.calibration.threshold(1)
            pc = _detect_pupil_ellipse(r_roi, r_thresh)
            if pc is not None:
                r_pupil_center = (r_origin[0] + pc[0], r_origin[1] + pc[1])
                use_image_pupil = True

        # Compute horizontal/vertical ratios
        if use_image_pupil and l_pupil_center and r_pupil_center:
            l_outer = lm[self.LANDMARK['LEFT_EYE_OUTER']]
            l_inner = lm[self.LANDMARK['LEFT_EYE_INNER']]
            r_outer = lm[self.LANDMARK['RIGHT_EYE_OUTER']]
            r_inner = lm[self.LANDMARK['RIGHT_EYE_INNER']]
            l_top = lm[self.LANDMARK['LEFT_EYE_TOP']]
            l_bot = lm[self.LANDMARK['LEFT_EYE_BOTTOM']]
            r_top = lm[self.LANDMARK['RIGHT_EYE_TOP']]
            r_bot = lm[self.LANDMARK['RIGHT_EYE_BOTTOM']]

            l_outer_px = (l_outer.x * w, l_outer.y * h)
            l_inner_px = (l_inner.x * w, l_inner.y * h)
            r_outer_px = (r_outer.x * w, r_outer.y * h)
            r_inner_px = (r_inner.x * w, r_inner.y * h)

            l_h = (l_pupil_center[0] - l_outer_px[0]) / (l_inner_px[0] - l_outer_px[0] + 1e-9)
            r_h = (r_pupil_center[0] - r_outer_px[0]) / (r_inner_px[0] - r_outer_px[0] + 1e-9)
            h_raw = (l_h + r_h) / 2

            l_v = (l_pupil_center[1] - l_top.y * h) / ((l_bot.y - l_top.y) * h + 1e-9)
            r_v = (r_pupil_center[1] - r_top.y * h) / ((r_bot.y - r_top.y) * h + 1e-9)
            v_raw = (l_v + r_v) / 2
        else:
            l_outer = lm[self.LANDMARK['LEFT_EYE_OUTER']]
            l_inner = lm[self.LANDMARK['LEFT_EYE_INNER']]
            r_outer = lm[self.LANDMARK['RIGHT_EYE_OUTER']]
            r_inner = lm[self.LANDMARK['RIGHT_EYE_INNER']]

            l_h = (l_iris.x - l_outer.x) / (l_inner.x - l_outer.x + 1e-9)
            r_h = (r_iris.x - r_outer.x) / (r_inner.x - r_outer.x + 1e-9)
            h_raw = (l_h + r_h) / 2

            l_top = lm[self.LANDMARK['LEFT_EYE_TOP']]
            l_bot = lm[self.LANDMARK['LEFT_EYE_BOTTOM']]
            r_top = lm[self.LANDMARK['RIGHT_EYE_TOP']]
            r_bot = lm[self.LANDMARK['RIGHT_EYE_BOTTOM']]
            l_v = (l_iris.y - l_top.y) / (l_bot.y - l_top.y + 1e-9)
            r_v = (r_iris.y - r_top.y) / (r_bot.y - r_top.y + 1e-9)
            v_raw = (l_v + r_v) / 2

        h_ratio = self.smooth_h.filter(np.clip(h_raw, 0, 1), t_ms)
        v_ratio = self.smooth_v.filter(np.clip(v_raw, 0, 1), t_ms)

        # Pupil coords (fallback to iris landmark)
        if use_image_pupil and l_pupil_center and r_pupil_center:
            l_pupil = (int(l_pupil_center[0]), int(l_pupil_center[1]))
            r_pupil = (int(r_pupil_center[0]), int(r_pupil_center[1]))
        else:
            l_pupil = (int(l_iris.x * w), int(l_iris.y * h))
            r_pupil = (int(r_iris.x * w), int(r_iris.y * h))

        # 3D gaze vectors
        gaze_vector_left = self._compute_gaze_vector(l_pupil, l_eye_3d, w, h)
        gaze_vector_right = self._compute_gaze_vector(r_pupil, r_eye_3d, w, h)

        avg_gaze = None
        if gaze_vector_left and gaze_vector_right:
            avg_gaze = (
                (gaze_vector_left[0] + gaze_vector_right[0]) / 2,
                (gaze_vector_left[1] + gaze_vector_right[1]) / 2,
                (gaze_vector_left[2] + gaze_vector_right[2]) / 2,
            )

        # Face bounding box
        xs = [lm[i].x for i in range(468)]
        ys = [lm[i].y for i in range(468)]
        face_box = {
            "x": min(xs), "y": min(ys),
            "w": max(xs) - min(xs), "h": max(ys) - min(ys),
        }

        head_pose = self.head_pose.estimate(lm, w, h, t_ms)

        # Eye sphere centers in image space (for frontend debug)
        l_eye_screen = (int(l_eye_3d[0] * w), int(l_eye_3d[1] * h))
        r_eye_screen = (int(r_eye_3d[0] * w), int(r_eye_3d[1] * h))

        return {
            "horizontalRatio": round(h_ratio, 3),
            "verticalRatio": round(v_ratio, 3),
            "leftPupil": l_pupil,
            "rightPupil": r_pupil,
            "leftEyeCenter": l_eye_screen,
            "rightEyeCenter": r_eye_screen,
            "faceBox": face_box,
            "headPose": head_pose,
            "pupilMethod": "ellipse" if use_image_pupil else "landmark",
            "calibrated": self.calibration.is_complete(),
            "gazeVector": avg_gaze,
            "gazeVectorLeft": gaze_vector_left,
            "gazeVectorRight": gaze_vector_right,
        }

    def close(self):
        self.face_mesh.close()

# ─── FPS Counter ────────────────────────────────────────────
class FPSCounter:
    def __init__(self, window=30):
        self.times = []
        self.window = window

    def tick(self):
        now = time.monotonic()
        self.times.append(now)
        while len(self.times) > self.window:
            self.times.pop(0)
        if len(self.times) < 2:
            return 0.0
        return (len(self.times) - 1) / (self.times[-1] - self.times[0])

# ─── Per-Hand Tracking State ────────────────────────────────
class HandTracker:
    def __init__(self):
        self.filter_bank = FilterBank()
        self.pinch = PinchResolver()
        self.last_time = 0.0
        self.present = False
        self.last_known = None
        self.hand_id = 'R'

    def validate_landmarks(self, lms):
        if len(lms) < 21:
            return False
        in_frame = sum(1 for lm in lms if -0.15 <= lm[0] <= 1.15 and -0.15 <= lm[1] <= 1.15)
        if in_frame < 8:
            return False
        xs = [lm[0] for lm in lms]
        ys = [lm[1] for lm in lms]
        w = max(xs) - min(xs)
        h = max(ys) - min(ys)
        if w < 0.02 or h < 0.02:
            return False
        return True

    def process(self, landmarks, now_ms, grace_ms=400):
        out = {"handId": self.hand_id, "predicting": False}
        raw = [(lm.x, lm.y, lm.z) for lm in landmarks]

        if not self.present:
            self.filter_bank.reset()
            self.present = True

        self.last_time = now_ms
        filtered = self.filter_bank.filter_landmarks(raw, now_ms)
        self.last_known = (filtered, now_ms)

        extended, extended_count, hand_span, pinch_dist = analyze_hand(
            [(lm["x"], lm["y"], lm["z"]) for lm in filtered]
        )
        is_pinching = self.pinch.resolve(pinch_dist, hand_span, extended)
        is_fist = (not is_pinching) and (extended_count == 0)
        gesture = "pinch" if is_pinching else ("fist" if is_fist else "open")

        out["handDetected"] = True
        out["landmarks"] = filtered
        out["gesture"] = gesture
        return out

    def predict(self, now_ms, grace_ms=400):
        out = {"handId": self.hand_id, "predicting": True}
        if not self.present or not self.last_known:
            out["handDetected"] = False
            return out

        elapsed = now_ms - self.last_time
        if elapsed > grace_ms:
            self.present = False
            self.last_known = None
            out["handDetected"] = False
            return out

        conf = 1.0 - elapsed / grace_ms
        decay = min(1.0, conf * 0.85)
        dt_s = max((now_ms - self.last_known[1]) / 1000.0, 1.0 / 120.0)
        predicted = []
        for i, (fx, fy) in enumerate(self.filter_bank.filters):
            lm = self.last_known[0][i]
            px = fx.predict(dt_s)
            py = fy.predict(dt_s)
            predicted.append({
                "x": px * decay + lm["x"] * (1.0 - decay),
                "y": py * decay + lm["y"] * (1.0 - decay),
                "z": lm["z"],
            })

        if not self.validate_landmarks([(lm["x"], lm["y"]) for lm in predicted]):
            predicted = self.last_known[0]

        extended, extended_count, hand_span, pinch_dist = analyze_hand(
            [(lm["x"], lm["y"], lm["z"]) for lm in predicted]
        )
        is_pinching = self.pinch.resolve(pinch_dist, hand_span, extended)
        is_fist = (not is_pinching) and (extended_count == 0)
        gesture = "pinch" if is_pinching else ("fist" if is_fist else "open")

        out["handDetected"] = True
        out["landmarks"] = predicted
        out["gesture"] = gesture
        return out

    def lost(self):
        self.present = False
        self.last_known = None
        return {"handId": self.hand_id, "handDetected": False}

# ─── Main Server ────────────────────────────────────────────
async def handler(websocket):
    print(f"[HandScope Backend] Client connected: {websocket.remote_address}")

    cap = cv2.VideoCapture(0, cv2.CAP_V4L2)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 60)

    mp_hands = mp.solutions.hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    gaze_tracker = GazeTracker()
    fps = FPSCounter()
    GRACE_MS = 400

    # Per-hand trackers
    hand_trackers = {}

    def get_tracker(hand_label):
        if hand_label not in hand_trackers:
            ht = HandTracker()
            ht.hand_id = 'R' if hand_label == 'Right' else 'L'
            hand_trackers[hand_label] = ht
        return hand_trackers[hand_label]

    await websocket.send(json.dumps({"type": "status", "status": "ok", "fps": 0}))

    try:
        while True:
            try:
                msg = await asyncio.wait_for(websocket.recv(), timeout=0.001)
                data = json.loads(msg)
                if data.get("type") == "config":
                    s = data.get("sensitivity", {})
                    p = data.get("pinchThresholds", {})
                    if "marginX" in s or "marginY" in s:
                        print(f"[Backend] Sensitivity: {s}")
                    if "enter" in p or "exit" in p:
                        for ht in hand_trackers.values():
                            ht.pinch.set_thresholds(p.get("enter"), p.get("exit"))
                        print(f"[Backend] Pinch thresholds: enter={p.get('enter')}, exit={p.get('exit')}")
            except (asyncio.TimeoutError, json.JSONDecodeError):
                pass

            ret, frame = cap.read()
            if not ret:
                await asyncio.sleep(0.01)
                continue

            now_ms = time.time() * 1000
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Gaze tracking
            gaze_data = gaze_tracker.process(frame, now_ms)

            # Hand tracking (both hands)
            hand_results = mp_hands.process(rgb)

            seen_labels = set()

            if hand_results.multi_hand_landmarks:
                for i, hls in enumerate(hand_results.multi_hand_landmarks):
                    label = "Right"
                    if hand_results.multi_handedness and i < len(hand_results.multi_handedness):
                        label = hand_results.multi_handedness[i].classification[0].label
                    seen_labels.add(label)
                    ht = get_tracker(label)
                    ht.process(hls.landmark, now_ms, GRACE_MS)

            # Mark missing hands
            for label, ht in list(hand_trackers.items()):
                ht.last_time = now_ms
                if label not in seen_labels:
                    result = ht.predict(now_ms, GRACE_MS)
                    if not result["handDetected"]:
                        del hand_trackers[label]

            # Build output
            hands_out = []
            for label, ht in hand_trackers.items():
                elapsed = now_ms - ht.last_time
                if ht.present and label not in seen_labels and elapsed <= GRACE_MS:
                    result = ht.predict(now_ms, GRACE_MS)
                elif ht.present and label in seen_labels:
                    result = ht.process(
                        hand_results.multi_hand_landmarks[
                            [h.classification[0].label for h in hand_results.multi_handedness].index(label)
                        ].landmark,
                        now_ms, GRACE_MS
                    )
                elif elapsed > GRACE_MS:
                    result = ht.lost()
                else:
                    continue
                if result["handDetected"]:
                    out_entry = {
                        "handId": result["handId"],
                        "landmarks": result["landmarks"],
                        "gesture": result["gesture"],
                        "predicting": result.get("predicting", False),
                    }
                    hands_out.append(out_entry)

            out = {
                "type": "frame",
                "timestamp": int(now_ms),
                "fps": round(fps.tick(), 1),
                "gaze": gaze_data,
                "hands": hands_out,
            }

            await websocket.send(json.dumps(out))

    except websockets.exceptions.ConnectionClosed:
        print(f"[HandScope Backend] Client disconnected: {websocket.remote_address}")
    finally:
        cap.release()
        mp_hands.close()
        gaze_tracker.close()


async def main():
    port = 8765
    print(f"[HandScope Backend] Starting WebSocket server on ws://localhost:{port}")
    print("[HandScope Backend] Multi-hand + Gaze 3D + Ellipse fitting (Orlosky)")
    async with websockets.serve(handler, "localhost", port):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
