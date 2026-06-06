import math
import os
import shutil
import subprocess
import time
from typing import Any, Callable

import cv2
from ultralytics import YOLO


ALLOWED_CLASS_MAP = {
    "person": 0,
    "rider": 1,
    "car": 2,
    "bus": 3,
    "truck": 4,
    "bike": 5,
    "motor": 6,
    "traffic light": 7,
    "traffic sign": 8,
    "train": 9
}

DEFAULT_VIDEO_FPS = 30.0
CAMERA_VERTICAL_FOV_DEGREES = 55.0
MIN_DEPTH_METERS = 0.8
MAX_DEPTH_METERS = 60.0

CLASS_ALIASES = {
    "person": "person",
    "people": "person",
    "pedestrian": "person",
    "car": "car",
    "auto": "car",
    "automobile": "car",
    "bicycle": "bike",
    "bike": "bike",
    "motorcycle": "motor",
    "motorbike": "motor",
    "trafficlight": "traffic light",
    "traffic_light": "traffic light",
    "trafficsign": "traffic sign",
    "traffic_sign": "traffic sign"
}

CLASS_METRIC_DIMENSIONS = {
    "person": {
        "width": 0.6,
        "height": 1.7,
        "depth": 0.45
    },
    "rider": {
        "width": 0.65,
        "height": 1.65,
        "depth": 0.6
    },
    "car": {
        "width": 1.8,
        "height": 1.5,
        "depth": 4.2
    },
    "bus": {
        "width": 2.6,
        "height": 3.2,
        "depth": 9.0
    },
    "truck": {
        "width": 2.5,
        "height": 3.0,
        "depth": 7.0
    },
    "bike": {
        "width": 0.55,
        "height": 1.15,
        "depth": 1.8
    },
    "motor": {
        "width": 0.8,
        "height": 1.25,
        "depth": 2.1
    },
    "traffic light": {
        "width": 0.35,
        "height": 1.1,
        "depth": 0.25
    },
    "traffic sign": {
        "width": 0.7,
        "height": 0.7,
        "depth": 0.18
    },
    "train": {
        "width": 3.0,
        "height": 3.6,
        "depth": 12.0
    }
}

CLASS_DRAW_COLORS = {
    "person": (255, 180, 60),
    "rider": (220, 120, 255),
    "car": (30, 180, 255),
    "bus": (0, 150, 255),
    "truck": (0, 120, 220),
    "bike": (100, 220, 100),
    "motor": (90, 200, 180),
    "traffic light": (50, 255, 255),
    "traffic sign": (180, 255, 120),
    "train": (255, 120, 120)
}

CUBOID_EDGE_INDEXES = [
    (0, 1),
    (1, 2),
    (2, 3),
    (3, 0),
    (4, 5),
    (5, 6),
    (6, 7),
    (7, 4),
    (0, 4),
    (1, 5),
    (2, 6),
    (3, 7)
]

POSE_MODEL_CANDIDATES = [
    "weights/best.pt",
    "best.pt",
    "weights/yolo11n-pose.pt",
    "yolo11n-pose.pt",
    "weights/yolov8n-pose.pt",
    "yolov8n-pose.pt"
]

COCO_PERSON_KEYPOINT_NAMES = [
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle"
]

COCO_PERSON_SKELETON = [
    [5, 7],
    [7, 9],
    [6, 8],
    [8, 10],
    [5, 6],
    [5, 11],
    [6, 12],
    [11, 12],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [0, 5],
    [0, 6]
]

MIN_POSE_MATCH_IOU = 0.15
MIN_KEYPOINT_CONFIDENCE = 0.2
HUMAN_POSE_LABELS = {"person", "rider"}


def resolve_model_path(model_path: str) -> str:
    if model_path and os.path.exists(model_path):
        return model_path

    if os.path.exists("weights/bdd100k_best.pt"):
        return "weights/bdd100k_best.pt"

    if os.path.exists("weights/best.pt"):
        return "weights/best.pt"

    if os.path.exists("weights/yolo11n.pt"):
        return "weights/yolo11n.pt"

    return "yolo11n.pt"


def resolve_pose_model_path(pose_model_path: str | None = None) -> str:
    candidates = []

    if pose_model_path:
        candidates.append(pose_model_path)

    candidates.extend(POSE_MODEL_CANDIDATES)

    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate

    if pose_model_path:
        return os.path.basename(pose_model_path)

    return "yolo11n-pose.pt"


def get_browser_mp4_temp_path(output_path: str) -> str:
    base, ext = os.path.splitext(output_path)

    if base.endswith("_detected"):
        return base[:-len("_detected")] + "_temp" + ext

    return base + "_temp" + ext


def resolve_ffmpeg_executable() -> str:
    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path:
        return ffmpeg_path

    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as exc:
        raise RuntimeError(
            "FFmpeg executable not found. Install ffmpeg or install imageio-ffmpeg."
        ) from exc


def format_command(cmd: list[str]) -> str:
    return " ".join(f'"{part}"' if " " in part else part for part in cmd)


def get_file_size(path: str | None) -> int:
    if not path or not os.path.exists(path):
        return 0

    return os.path.getsize(path)


def transcode_to_browser_mp4(input_path: str, output_path: str) -> None:
    ffmpeg = resolve_ffmpeg_executable()

    if os.path.exists(output_path):
        os.remove(output_path)

    cmd = [
        ffmpeg,
        "-y",
        "-i",
        input_path,
        "-vcodec",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        output_path
    ]

    print(f"[FFMPEG] command={format_command(cmd)}")

    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    if result.returncode != 0:
        print(f"[FFMPEG ERROR] stderr={result.stderr}")
        raise RuntimeError(f"FFmpeg transcode failed: {result.stderr}")

    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise RuntimeError("Final video file was not created or is empty")


def normalize_fps(raw_fps: float | int | None) -> float:
    try:
        fps = float(raw_fps or 0)
    except (TypeError, ValueError):
        return DEFAULT_VIDEO_FPS

    if fps <= 0 or not math.isfinite(fps):
        return DEFAULT_VIDEO_FPS

    return fps


def prepare_frame_for_video_writer(frame, frame_index: int, width: int, height: int):
    if frame is None:
        raise RuntimeError(f"Frame {frame_index} is None")

    if str(frame.dtype) != "uint8":
        raise RuntimeError(f"Frame {frame_index} dtype must be uint8, got {frame.dtype}")

    if len(frame.shape) != 3 or frame.shape[2] != 3:
        raise RuntimeError(f"Frame {frame_index} must be a 3-channel BGR image")

    if frame.shape[1] != width or frame.shape[0] != height:
        frame = cv2.resize(frame, (width, height))

    if frame.shape[1] != width or frame.shape[0] != height:
        raise RuntimeError(
            f"Frame {frame_index} size mismatch after resize: "
            f"{frame.shape[1]}x{frame.shape[0]} != {width}x{height}"
        )

    return frame


def build_video_progress(total_frames: int, processed_frames: int, stage: str) -> dict:
    safe_total_frames = max(int(total_frames or 0), 0)
    safe_processed_frames = max(int(processed_frames or 0), 0)

    if stage == "transcoding":
        progress = 96
    elif stage == "finalizing":
        progress = 99
    elif safe_total_frames > 0:
        progress = int((safe_processed_frames / safe_total_frames) * 95)
        progress = max(1, min(95, progress))
    else:
        progress = 1

    return {
        "stage": stage,
        "total_frames": safe_total_frames,
        "processed_frames": safe_processed_frames,
        "progress": progress
    }


def emit_video_progress(progress_callback: Callable[[dict], None] | None, payload: dict) -> None:
    if progress_callback:
        progress_callback(payload)


def clamp_float(value: float, minimum: float, maximum: float) -> float:
    return min(max(value, minimum), maximum)


def normalize_class_label(label: str) -> str:
    normalized = str(label or "").strip().lower()
    return CLASS_ALIASES.get(normalized, normalized)


def get_camera_intrinsics(image_width: int, image_height: int) -> dict:
    safe_width = max(float(image_width), 1.0)
    safe_height = max(float(image_height), 1.0)
    vertical_fov_radians = math.radians(CAMERA_VERTICAL_FOV_DEGREES)
    focal = safe_height / (2.0 * math.tan(vertical_fov_radians / 2.0))

    return {
        "fx": focal,
        "fy": focal,
        "cx": safe_width / 2.0,
        "cy": safe_height / 2.0
    }


def get_class_dimensions(label: str, bbox: dict, image_height: int) -> dict:
    if label in CLASS_METRIC_DIMENSIONS:
        return CLASS_METRIC_DIMENSIONS[label]

    bbox_height_ratio = float(bbox["height"]) / max(float(image_height), 1.0)
    visual_height = clamp_float(1.1 + bbox_height_ratio * 3.2, 1.2, 3.4)

    return {
        "width": 1.0,
        "height": visual_height,
        "depth": 0.8
    }


def project_point(point: dict, intrinsics: dict) -> dict | None:
    z = float(point["z"])

    if z <= 0.05 or not math.isfinite(z):
        return None

    x = intrinsics["fx"] * float(point["x"]) / z + intrinsics["cx"]
    y = intrinsics["fy"] * float(point["y"]) / z + intrinsics["cy"]

    if not math.isfinite(x) or not math.isfinite(y):
        return None

    return {
        "x": round(x, 2),
        "y": round(y, 2)
    }


def build_projected_cuboid(
    world_x: float,
    camera_bottom_y: float,
    depth: float,
    dimensions: dict,
    intrinsics: dict
) -> list[dict] | None:
    half_width = float(dimensions["width"]) / 2.0
    half_depth = float(dimensions["depth"]) / 2.0
    height = float(dimensions["height"])

    front_z = max(depth - half_depth, 0.05)
    back_z = max(depth + half_depth, front_z + 0.05)
    top_y = camera_bottom_y - height
    bottom_y = camera_bottom_y

    corners_3d = [
        {"x": world_x - half_width, "y": top_y, "z": front_z},
        {"x": world_x + half_width, "y": top_y, "z": front_z},
        {"x": world_x + half_width, "y": bottom_y, "z": front_z},
        {"x": world_x - half_width, "y": bottom_y, "z": front_z},
        {"x": world_x - half_width, "y": top_y, "z": back_z},
        {"x": world_x + half_width, "y": top_y, "z": back_z},
        {"x": world_x + half_width, "y": bottom_y, "z": back_z},
        {"x": world_x - half_width, "y": bottom_y, "z": back_z}
    ]

    projected = [project_point(point, intrinsics) for point in corners_3d]

    if any(point is None for point in projected):
        return None

    return projected


def estimate_3d_from_bbox(
    bbox: dict,
    image_width: int,
    image_height: int,
    label: str
) -> dict:
    bbox_height = max(float(bbox["height"]), 1.0)

    center_x = (bbox["x1"] + bbox["x2"]) / 2
    intrinsics = get_camera_intrinsics(image_width, image_height)
    dimensions = get_class_dimensions(label, bbox, image_height)
    raw_depth = dimensions["height"] * intrinsics["fy"] / bbox_height
    depth = clamp_float(raw_depth, MIN_DEPTH_METERS, MAX_DEPTH_METERS)

    world_x = (center_x - intrinsics["cx"]) * depth / intrinsics["fx"]
    camera_bottom_y = (bbox["y2"] - intrinsics["cy"]) * depth / intrinsics["fy"]
    projected_corners_2d = build_projected_cuboid(
        world_x=world_x,
        camera_bottom_y=camera_bottom_y,
        depth=depth,
        dimensions=dimensions,
        intrinsics=intrinsics
    )

    return {
        "depth": round(depth, 3),
        "bbox_3d": {
            "center": {
                "x": round(world_x, 3),
                "y": round(float(dimensions["height"]) / 2.0, 3),
                "z": round(depth, 3)
            },
            "size": {
                "width": round(float(dimensions["width"]), 3),
                "height": round(float(dimensions["height"]), 3),
                "depth": round(float(dimensions["depth"]), 3)
            },
            "rotation_y": 0.0,
            "projected_corners_2d": projected_corners_2d
        }
    }


def to_cv_point(point: dict) -> tuple[int, int]:
    return int(round(point["x"])), int(round(point["y"]))


def draw_3d_bbox_overlay(image, objects: list[dict]):
    if image is None or not objects:
        return image

    frame_height, frame_width = image.shape[:2]
    thickness = max(2, round(min(frame_width, frame_height) / 420))
    font_scale = max(0.45, min(frame_width, frame_height) / 1500)
    font_thickness = max(1, thickness - 1)

    for obj in objects:
        bbox_3d = obj.get("bbox_3d") or {}
        corners = bbox_3d.get("projected_corners_2d")

        if not corners or len(corners) < 8:
            continue

        color = CLASS_DRAW_COLORS.get(obj.get("label"), (255, 255, 255))
        points = [to_cv_point(point) for point in corners]

        for edge_index, (start, end) in enumerate(CUBOID_EDGE_INDEXES):
            line_thickness = thickness + 1 if edge_index < 4 else thickness
            cv2.line(
                image,
                points[start],
                points[end],
                color,
                line_thickness,
                cv2.LINE_AA
            )

        label = f"3D {obj.get('depth', 0):.1f}m"
        text_origin = points[0][0], max(points[0][1] - 8, 16)
        cv2.putText(
            image,
            label,
            text_origin,
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            (0, 0, 0),
            font_thickness + 3,
            cv2.LINE_AA
        )
        cv2.putText(
            image,
            label,
            text_origin,
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            color,
            font_thickness,
            cv2.LINE_AA
        )

    return image


def tensor_to_list(value: Any) -> list:
    if value is None:
        return []

    try:
        if hasattr(value, "cpu"):
            value = value.cpu()
        if hasattr(value, "tolist"):
            return value.tolist()
    except Exception:
        return []

    if isinstance(value, list):
        return value

    return []


def bbox_from_xyxy(coords: list | tuple) -> dict | None:
    if not coords or len(coords) < 4:
        return None

    x1, y1, x2, y2 = [float(value) for value in coords[:4]]

    if not all(math.isfinite(value) for value in [x1, y1, x2, y2]):
        return None

    width = max(x2 - x1, 1.0)
    height = max(y2 - y1, 1.0)

    return {
        "x1": round(x1, 2),
        "y1": round(y1, 2),
        "x2": round(x2, 2),
        "y2": round(y2, 2),
        "width": round(width, 2),
        "height": round(height, 2)
    }


def bbox_iou(first: dict | None, second: dict | None) -> float:
    if not first or not second:
        return 0.0

    x_left = max(float(first["x1"]), float(second["x1"]))
    y_top = max(float(first["y1"]), float(second["y1"]))
    x_right = min(float(first["x2"]), float(second["x2"]))
    y_bottom = min(float(first["y2"]), float(second["y2"]))

    intersection_width = max(x_right - x_left, 0.0)
    intersection_height = max(y_bottom - y_top, 0.0)
    intersection = intersection_width * intersection_height

    if intersection <= 0:
        return 0.0

    first_area = max(float(first["width"]), 1.0) * max(float(first["height"]), 1.0)
    second_area = max(float(second["width"]), 1.0) * max(float(second["height"]), 1.0)
    union = first_area + second_area - intersection

    if union <= 0:
        return 0.0

    return intersection / union


def normalize_keypoint(raw_keypoint: list | tuple) -> list | None:
    if not raw_keypoint or len(raw_keypoint) < 2:
        return None

    x = float(raw_keypoint[0])
    y = float(raw_keypoint[1])
    confidence = float(raw_keypoint[2]) if len(raw_keypoint) > 2 else 1.0

    if not math.isfinite(x) or not math.isfinite(y):
        return None

    if not math.isfinite(confidence):
        confidence = 0.0

    return [
        round(x, 2),
        round(y, 2),
        round(clamp_float(confidence, 0.0, 1.0), 4)
    ]


def keypoint_is_visible(keypoint: list | tuple) -> bool:
    if not keypoint or len(keypoint) < 2:
        return False

    x = float(keypoint[0])
    y = float(keypoint[1])
    confidence = float(keypoint[2]) if len(keypoint) > 2 else 1.0

    return (
        math.isfinite(x)
        and math.isfinite(y)
        and x > 0
        and y > 0
        and confidence >= MIN_KEYPOINT_CONFIDENCE
    )


def bbox_from_keypoints(keypoints: list[list]) -> dict | None:
    visible = [point for point in keypoints if keypoint_is_visible(point)]

    if not visible:
        return None

    xs = [point[0] for point in visible]
    ys = [point[1] for point in visible]

    return bbox_from_xyxy([min(xs), min(ys), max(xs), max(ys)])


def extract_pose_detections(result: Any) -> list[dict]:
    if result is None or getattr(result, "keypoints", None) is None:
        return []

    keypoints_data = tensor_to_list(result.keypoints.data)
    boxes = getattr(result, "boxes", None)
    boxes_xyxy = tensor_to_list(boxes.xyxy if boxes is not None else None)
    boxes_conf = tensor_to_list(boxes.conf if boxes is not None else None)

    detections = []

    for index, raw_keypoints in enumerate(keypoints_data):
        keypoints = []

        for raw_keypoint in raw_keypoints:
            keypoint = normalize_keypoint(raw_keypoint)
            if keypoint is not None:
                keypoints.append(keypoint)

        if not keypoints:
            continue

        bbox = bbox_from_xyxy(boxes_xyxy[index]) if index < len(boxes_xyxy) else None
        if bbox is None:
            bbox = bbox_from_keypoints(keypoints)

        if bbox is None:
            continue

        visible_confidences = [
            float(point[2])
            for point in keypoints
            if len(point) > 2 and float(point[2]) >= MIN_KEYPOINT_CONFIDENCE
        ]
        box_confidence = float(boxes_conf[index]) if index < len(boxes_conf) else None
        pose_confidence = (
            sum(visible_confidences) / len(visible_confidences)
            if visible_confidences
            else box_confidence
        )

        detections.append({
            "bbox_2d": bbox,
            "keypoints": keypoints,
            "keypoint_names": COCO_PERSON_KEYPOINT_NAMES,
            "skeleton": COCO_PERSON_SKELETON,
            "pose_confidence": round(float(pose_confidence or 0.0), 4)
        })

    return detections


def attach_pose_to_human_objects(objects: list[dict], pose_detections: list[dict]) -> None:
    if not objects or not pose_detections:
        return

    used_pose_indexes = set()

    for obj in objects:
        if obj.get("label") not in HUMAN_POSE_LABELS:
            continue

        bbox = obj.get("bbox_2d")
        best_index = None
        best_iou = 0.0

        for index, pose in enumerate(pose_detections):
            if index in used_pose_indexes:
                continue

            current_iou = bbox_iou(bbox, pose.get("bbox_2d"))
            if current_iou > best_iou:
                best_iou = current_iou
                best_index = index

        if best_index is None or best_iou < MIN_POSE_MATCH_IOU:
            continue

        pose = pose_detections[best_index]
        used_pose_indexes.add(best_index)
        obj["keypoints"] = pose["keypoints"]
        obj["keypoint_names"] = pose["keypoint_names"]
        obj["skeleton"] = pose["skeleton"]
        obj["pose_confidence"] = pose["pose_confidence"]


def predict_pose_detections(
    pose_model: YOLO | None,
    source: Any,
    confidence: float,
    iou: float
) -> list[dict]:
    if pose_model is None:
        return []

    results = pose_model.predict(
        source=source,
        conf=confidence,
        iou=iou,
        verbose=False
    )

    if not results:
        return []

    return extract_pose_detections(results[0])


def draw_pose_overlay(image, objects: list[dict]):
    if image is None or not objects:
        return image

    frame_height, frame_width = image.shape[:2]
    thickness = max(2, round(min(frame_width, frame_height) / 360))
    radius = max(3, round(min(frame_width, frame_height) / 220))

    for obj in objects:
        if obj.get("label") not in HUMAN_POSE_LABELS:
            continue

        keypoints = obj.get("keypoints") or []
        if not keypoints:
            continue

        skeleton = obj.get("skeleton") or COCO_PERSON_SKELETON

        for start, end in skeleton:
            if start >= len(keypoints) or end >= len(keypoints):
                continue

            first = keypoints[start]
            second = keypoints[end]

            if not keypoint_is_visible(first) or not keypoint_is_visible(second):
                continue

            cv2.line(
                image,
                (int(round(first[0])), int(round(first[1]))),
                (int(round(second[0])), int(round(second[1]))),
                (80, 255, 120),
                thickness,
                cv2.LINE_AA
            )

        for keypoint in keypoints:
            if not keypoint_is_visible(keypoint):
                continue

            center = int(round(keypoint[0])), int(round(keypoint[1]))
            cv2.circle(image, center, radius + 1, (0, 0, 0), -1, cv2.LINE_AA)
            cv2.circle(image, center, radius, (255, 80, 255), -1, cv2.LINE_AA)

    return image


def build_object_from_box(
    box: Any,
    model_names: dict,
    image_width: int,
    image_height: int,
    track_id=None,
    enable_3d: bool = False
):
    raw_class_id = int(box.cls[0])
    raw_label = model_names.get(raw_class_id, str(raw_class_id))
    label = normalize_class_label(raw_label)

    if label not in ALLOWED_CLASS_MAP:
        return None

    x1, y1, x2, y2 = box.xyxy[0].tolist()

    width = x2 - x1
    height = y2 - y1

    bbox_2d = {
        "x1": round(float(x1), 2),
        "y1": round(float(y1), 2),
        "x2": round(float(x2), 2),
        "y2": round(float(y2), 2),
        "width": round(float(width), 2),
        "height": round(float(height), 2)
    }

    center_2d = {
        "x": round(float((x1 + x2) / 2), 2),
        "y": round(float((y1 + y2) / 2), 2)
    }

    obj = {
        "track_id": int(track_id) if track_id is not None else None,
        "class_id": ALLOWED_CLASS_MAP[label],
        "label": label,
        "confidence": round(float(box.conf[0]), 4),
        "bbox_2d": bbox_2d,
        "center_2d": center_2d,
        "depth": None,
        "bbox_3d": None,
        "keypoints": []
    }

    if enable_3d:
        estimated = estimate_3d_from_bbox(
            bbox=bbox_2d,
            image_width=image_width,
            image_height=image_height,
            label=label
        )
        obj["depth"] = estimated["depth"]
        obj["bbox_3d"] = estimated["bbox_3d"]

    return obj


def detect_image(
    image_path: str,
    model_path: str,
    pose_model_path: str | None = None,
    confidence: float = 0.25,
    iou: float = 0.45,
    enable_3d: bool = False,
    enable_pose: bool = False,
    output_path: str | None = None
) -> dict:
    start_time = time.time()

    resolved_model_path = resolve_model_path(model_path)
    model = YOLO(resolved_model_path)
    pose_model = YOLO(resolve_pose_model_path(pose_model_path)) if enable_pose else None

    results = model.predict(
        source=image_path,
        conf=confidence,
        iou=iou,
        verbose=False
    )

    result = results[0]
    image_height, image_width = result.orig_shape

    objects = []

    for box in result.boxes:
        obj = build_object_from_box(
            box=box,
            model_names=model.names,
            image_width=image_width,
            image_height=image_height,
            enable_3d=enable_3d
        )

        if obj:
            objects.append(obj)

    if enable_pose:
        pose_detections = predict_pose_detections(
            pose_model=pose_model,
            source=image_path,
            confidence=confidence,
            iou=iou
        )
        attach_pose_to_human_objects(objects, pose_detections)

    result_image_url = None

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        annotated_image = result.plot()
        if enable_3d:
            annotated_image = draw_3d_bbox_overlay(annotated_image, objects)
        if enable_pose:
            annotated_image = draw_pose_overlay(annotated_image, objects)
        cv2.imwrite(output_path, annotated_image)

        result_image_url = "/outputs/images/" + os.path.basename(output_path)

    processing_time_ms = int((time.time() - start_time) * 1000)

    print(f"[IMAGE DETECTION] file={image_path}")
    for obj in objects:
        print(
            f"Class={obj['label']} | "
            f"Conf={obj['confidence']} | "
            f"BBox2D=[{obj['bbox_2d']['x1']},{obj['bbox_2d']['y1']},{obj['bbox_2d']['x2']},{obj['bbox_2d']['y2']}] | "
            f"Depth={obj['depth']} | "
            f"Keypoints={len(obj.get('keypoints') or [])}"
        )
    print(f"[DONE] processing_time_ms={processing_time_ms}")

    return {
        "media_type": "image",
        "model_version": "yolo_model",
        "processing_time_ms": processing_time_ms,
        "result_image_url": result_image_url,
        "frames": [
            {
                "frame_index": 0,
                "timestamp": 0.0,
                "image_width": image_width,
                "image_height": image_height,
                "objects": objects
            }
        ]
    }


def detect_video(
    video_path: str,
    model_path: str,
    pose_model_path: str | None = None,
    confidence: float = 0.25,
    iou: float = 0.45,
    enable_tracking: bool = True,
    enable_3d: bool = False,
    enable_pose: bool = False,
    output_path: str | None = None,
    progress_callback: Callable[[dict], None] | None = None
) -> dict:
    start_time = time.time()

    cap = cv2.VideoCapture(video_path)

    try:
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open input video: {video_path}")

        fps = normalize_fps(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        video_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        video_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    finally:
        cap.release()

    if video_width <= 0 or video_height <= 0:
        raise RuntimeError(
            f"Invalid input video dimensions: width={video_width}, height={video_height}"
        )

    emit_video_progress(
        progress_callback,
        build_video_progress(total_frames=total_frames, processed_frames=0, stage="starting")
    )

    resolved_model_path = resolve_model_path(model_path)
    model = YOLO(resolved_model_path)
    pose_model = YOLO(resolve_pose_model_path(pose_model_path)) if enable_pose else None

    result_video_url = None
    temp_output_path = None
    video_writer = None

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        temp_output_path = get_browser_mp4_temp_path(output_path)

        if os.path.exists(temp_output_path):
            os.remove(temp_output_path)

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        video_writer = cv2.VideoWriter(
            temp_output_path,
            fourcc,
            fps,
            (video_width, video_height)
        )

        if not video_writer.isOpened():
            raise RuntimeError(f"Cannot open temporary video writer: {temp_output_path}")

        result_video_url = "/outputs/videos/" + os.path.basename(output_path)

        print(
            f"[VIDEO OUTPUT] input={video_path} temp={temp_output_path} final={output_path} "
            f"fps={fps} width={video_width} height={video_height} total_frames={total_frames}"
        )

    if enable_tracking:
        results_generator = model.track(
            source=video_path,
            stream=True,
            persist=True,
            conf=confidence,
            iou=iou,
            verbose=False
        )
    else:
        results_generator = model.predict(
            source=video_path,
            stream=True,
            conf=confidence,
            iou=iou,
            verbose=False
        )

    frames = []

    try:
        for frame_index, result in enumerate(results_generator):
            image_height, image_width = result.orig_shape
            timestamp = frame_index / fps if fps else 0.0

            objects = []
            boxes = result.boxes

            track_ids = None
            if enable_tracking and boxes is not None and boxes.id is not None:
                track_ids = boxes.id.tolist()

            if boxes is not None:
                for i, box in enumerate(boxes):
                    track_id = track_ids[i] if track_ids else None

                    obj = build_object_from_box(
                        box=box,
                        model_names=model.names,
                        image_width=image_width,
                        image_height=image_height,
                        track_id=track_id,
                        enable_3d=enable_3d
                    )

                    if obj:
                        objects.append(obj)

            if enable_pose:
                pose_source = getattr(result, "orig_img", None)
                if pose_source is not None:
                    pose_detections = predict_pose_detections(
                        pose_model=pose_model,
                        source=pose_source,
                        confidence=confidence,
                        iou=iou
                    )
                    attach_pose_to_human_objects(objects, pose_detections)

            if video_writer is not None:
                annotated_frame = result.plot()
                if enable_3d:
                    annotated_frame = draw_3d_bbox_overlay(annotated_frame, objects)
                if enable_pose:
                    annotated_frame = draw_pose_overlay(annotated_frame, objects)
                annotated_frame = prepare_frame_for_video_writer(
                    frame=annotated_frame,
                    frame_index=frame_index,
                    width=video_width,
                    height=video_height
                )
                video_writer.write(annotated_frame)

            frames.append({
                "frame_index": frame_index,
                "timestamp": round(float(timestamp), 3),
                "image_width": image_width,
                "image_height": image_height,
                "objects": objects
            })

            processed_frames = frame_index + 1
            emit_video_progress(
                progress_callback,
                build_video_progress(
                    total_frames=total_frames,
                    processed_frames=processed_frames,
                    stage="detecting"
                )
            )

            print(f"[VIDEO DETECTION] Frame={frame_index} | Objects={len(objects)}")
    finally:
        if video_writer is not None:
            video_writer.release()

    processed_frames = len(frames)

    if output_path and temp_output_path:
        temp_file_size = get_file_size(temp_output_path)
        print(
            f"[VIDEO OUTPUT] processed_frames={processed_frames} "
            f"temp_file_size={temp_file_size}"
        )

        if processed_frames == 0:
            raise RuntimeError("No frames were processed from input video")

        if temp_file_size <= 0:
            raise RuntimeError("Temporary video file was not created or is empty")

        emit_video_progress(
            progress_callback,
            build_video_progress(
                total_frames=total_frames,
                processed_frames=processed_frames,
                stage="transcoding"
            )
        )

        transcode_to_browser_mp4(temp_output_path, output_path)

        final_file_size = get_file_size(output_path)
        print(
            f"[VIDEO OUTPUT] final={output_path} final_file_size={final_file_size}"
        )

        emit_video_progress(
            progress_callback,
            build_video_progress(
                total_frames=total_frames,
                processed_frames=processed_frames,
                stage="finalizing"
            )
        )

    processing_time_ms = int((time.time() - start_time) * 1000)

    print(
        f"[DONE] total_frames={total_frames if total_frames else processed_frames} "
        f"processed_frames={processed_frames} processing_time_ms={processing_time_ms}"
    )

    return {
        "media_type": "video",
        "model_version": "yolo_model",
        "fps": fps,
        "total_frames": total_frames if total_frames else processed_frames,
        "processed_frames": processed_frames,
        "processing_time_ms": processing_time_ms,
        "result_video_url": result_video_url,
        "frames": frames
    }
