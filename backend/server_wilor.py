import asyncio
import json
import time
import warnings
import logging

import cv2
import numpy as np
import torch
import websockets

warnings.filterwarnings("ignore", category=UserWarning)
logging.basicConfig(level=logging.WARNING)

from wilor_mini.pipelines.wilor_hand_pose3d_estimation_pipeline import WiLorHandPose3dEstimationPipeline


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

        avg_hand_span = sum(self.hand_span_history) / len(self.hand_span_history)

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


def validate_landmarks(lms):
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


async def handler(websocket):
    print(f"[WiLoR Backend] Client connected: {websocket.remote_address}")

    cap = cv2.VideoCapture(0, cv2.CAP_V4L2)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    print("[WiLoR Backend] Loading WiLoR model...")
    pipeline = WiLorHandPose3dEstimationPipeline(
        device=torch.device("cpu"),
        verbose=False,
    )
    print("[WiLoR Backend] WiLoR model loaded")

    hand_filters = {}
    hand_pinches = {}
    hand_present = {}
    last_hand_time = {}
    last_known = {}
    fps = FPSCounter()
    GRACE_MS = 400

    await websocket.send(json.dumps({"type": "status", "status": "ok", "model": "wilor", "fps": 0}))

    try:
        while True:
            try:
                msg = await asyncio.wait_for(websocket.recv(), timeout=0.001)
                data = json.loads(msg)
                if data.get("type") == "config":
                    p = data.get("pinchThresholds", {})
                    for pid in hand_pinches:
                        if "enter" in p or "exit" in p:
                            hand_pinches[pid].set_thresholds(p.get("enter"), p.get("exit"))
            except (asyncio.TimeoutError, json.JSONDecodeError):
                pass

            ret, frame = cap.read()
            if not ret:
                await asyncio.sleep(0.01)
                continue

            now_ms = time.time() * 1000
            results = pipeline.predict(frame)

            detected_ids = set()
            for det in results:
                wilor = det.get("wilor_preds")
                if wilor is None:
                    continue
                is_right = det["is_right"]
                hand_id = "right" if is_right > 0.5 else "left"
                detected_ids.add(hand_id)

                kp_2d = wilor["pred_keypoints_2d"][0]
                kp_3d = wilor["pred_keypoints_3d"][0]
                img_h, img_w = frame.shape[:2]
                raw = [(kp_2d[i][0] / img_w, kp_2d[i][1] / img_h, kp_3d[i][2]) for i in range(21)]

                if hand_id not in hand_filters:
                    hand_filters[hand_id] = FilterBank()
                    hand_pinches[hand_id] = PinchResolver()
                    hand_present[hand_id] = False
                    last_known[hand_id] = None

                if not hand_present.get(hand_id, False):
                    hand_filters[hand_id].reset()
                    hand_present[hand_id] = True

                last_hand_time[hand_id] = now_ms
                filtered = hand_filters[hand_id].filter_landmarks(raw, now_ms)
                last_known[hand_id] = (filtered, now_ms)

                extended, extended_count, hand_span, pinch_dist = analyze_hand(
                    [(lm["x"], lm["y"], lm["z"]) for lm in filtered]
                )
                is_pinching = hand_pinches[hand_id].resolve(pinch_dist, hand_span, extended)
                is_fist = (not is_pinching) and (extended_count == 0)
                gesture = "pinch" if is_pinching else ("fist" if is_fist else "open")

                fps_val = round(fps.tick(), 1)

                landmark_list = []
                for lm in filtered:
                    landmark_list.append({"x": lm["x"], "y": lm["y"], "z": lm["z"]})

                await websocket.send(json.dumps({
                    "type": "frame",
                    "timestamp": int(now_ms),
                    "handDetected": True,
                    "handId": hand_id,
                    "landmarks": landmark_list,
                    "gesture": gesture,
                    "fps": fps_val,
                }))

            for hand_id in list(hand_present.keys()):
                if hand_id not in detected_ids and hand_present[hand_id]:
                    elapsed = now_ms - last_hand_time.get(hand_id, now_ms)
                    if elapsed <= GRACE_MS and last_known.get(hand_id):
                        conf = 1.0 - elapsed / GRACE_MS
                        decay = min(1.0, conf * 0.85)
                        lk = last_known[hand_id][0]
                        dt_s = max((now_ms - last_known[hand_id][1]) / 1000.0, 1.0 / 120.0)
                        predicted = []
                        for i, (fx, fy) in enumerate(hand_filters[hand_id].filters):
                            if i < len(lk):
                                lm = lk[i]
                                px = fx.predict(dt_s)
                                py = fy.predict(dt_s)
                                predicted.append({
                                    "x": px * decay + lm["x"] * (1.0 - decay),
                                    "y": py * decay + lm["y"] * (1.0 - decay),
                                    "z": lm["z"],
                                })

                        lms_flat = [(lm["x"], lm["y"], lm["z"]) for lm in predicted]
                        if validate_landmarks(lms_flat):
                            extended, extended_count, hand_span, pinch_dist = analyze_hand(lms_flat)
                            is_pinching = hand_pinches[hand_id].resolve(pinch_dist, hand_span, extended)
                            is_fist = (not is_pinching) and (extended_count == 0)
                            gesture = "pinch" if is_pinching else ("fist" if is_fist else "open")

                            landmark_list = []
                            for lm in predicted:
                                landmark_list.append({"x": lm["x"], "y": lm["y"], "z": lm["z"]})

                            await websocket.send(json.dumps({
                                "type": "frame",
                                "timestamp": int(now_ms),
                                "handDetected": True,
                                "handId": hand_id,
                                "landmarks": landmark_list,
                                "gesture": gesture,
                                "predicting": True,
                                "fps": round(fps.tick(), 1),
                            }))
                            continue

                    hand_present[hand_id] = False
                    last_known[hand_id] = None
                    await websocket.send(json.dumps({
                        "type": "frame",
                        "timestamp": int(now_ms),
                        "handDetected": False,
                        "handId": hand_id,
                        "fps": round(fps.tick(), 1),
                    }))

    except websockets.exceptions.ConnectionClosed:
        print(f"[WiLoR Backend] Client disconnected: {websocket.remote_address}")
    finally:
        cap.release()


async def main():
    port = 8766
    print(f"[WiLoR Backend] Starting WebSocket server on ws://localhost:{port}")
    print("[WiLoR Backend] Using WiLoR model (YOLO detector + ViT 3D reconstruction)")
    async with websockets.serve(handler, "localhost", port):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
