import os
import time
from typing import Any

import cv2
from ultralytics import YOLO


ALLOWED_CLASS_MAP = {
    "person": 0,
    "car": 1,
    "bicycle": 2
}


def resolve_model_path(model_path: str) -> str:
    if model_path and os.path.exists(model_path):
        return model_path

    if os.path.exists("weights/best.pt"):
        return "weights/best.pt"

    if os.path.exists("weights/yolo11n.pt"):
        return "weights/yolo11n.pt"

    return "yolo11n.pt"


def estimate_3d_from_bbox(bbox: dict, image_width: int, image_height: int) -> dict:
    bbox_height = max(float(bbox["height"]), 1.0)
    bbox_width = max(float(bbox["width"]), 1.0)

    center_x = (bbox["x1"] + bbox["x2"]) / 2
    center_y = (bbox["y1"] + bbox["y2"]) / 2

    depth = round(1000.0 / bbox_height, 3)

    world_x = round((center_x - image_width / 2) / image_width * depth, 3)
    world_y = round((center_y - image_height / 2) / image_height * depth, 3)
    world_z = depth

    return {
        "depth": depth,
        "bbox_3d": {
            "center": {
                "x": world_x,
                "y": world_y,
                "z": world_z
            },
            "size": {
                "width": round(bbox_width / 100.0, 3),
                "height": round(bbox_height / 100.0, 3),
                "depth": 0.6
            },
            "rotation_y": 0.0
        }
    }


def build_object_from_box(
    box: Any,
    model_names: dict,
    image_width: int,
    image_height: int,
    track_id=None,
    enable_3d: bool = False
):
    raw_class_id = int(box.cls[0])
    label = model_names.get(raw_class_id, str(raw_class_id))

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
        estimated = estimate_3d_from_bbox(bbox_2d, image_width, image_height)
        obj["depth"] = estimated["depth"]
        obj["bbox_3d"] = estimated["bbox_3d"]

    return obj


def detect_image(
    image_path: str,
    model_path: str,
    confidence: float = 0.25,
    iou: float = 0.45,
    enable_3d: bool = False,
    output_path: str | None = None
) -> dict:
    start_time = time.time()

    resolved_model_path = resolve_model_path(model_path)
    model = YOLO(resolved_model_path)

    results = model.predict(
        source=image_path,
        conf=confidence,
        iou=iou,
        verbose=False
    )

    result = results[0]
    image_height, image_width = result.orig_shape

    result_image_url = None

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        annotated_image = result.plot()
        cv2.imwrite(output_path, annotated_image)

        result_image_url = "/outputs/images/" + os.path.basename(output_path)

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

    processing_time_ms = int((time.time() - start_time) * 1000)

    print(f"[IMAGE DETECTION] file={image_path}")
    for obj in objects:
        print(
            f"Class={obj['label']} | "
            f"Conf={obj['confidence']} | "
            f"BBox2D=[{obj['bbox_2d']['x1']},{obj['bbox_2d']['y1']},{obj['bbox_2d']['x2']},{obj['bbox_2d']['y2']}] | "
            f"Depth={obj['depth']}"
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
    confidence: float = 0.25,
    iou: float = 0.45,
    enable_tracking: bool = True,
    enable_3d: bool = False,
    output_path: str | None = None
) -> dict:
    start_time = time.time()

    cap = cv2.VideoCapture(video_path)

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    video_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    video_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    cap.release()

    resolved_model_path = resolve_model_path(model_path)
    model = YOLO(resolved_model_path)

    result_video_url = None
    video_writer = None

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        video_writer = cv2.VideoWriter(
            output_path,
            fourcc,
            fps,
            (video_width, video_height)
        )

        result_video_url = "/outputs/videos/" + os.path.basename(output_path)

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

        # Vẽ bbox trực tiếp lên frame video
        if video_writer is not None:
            annotated_frame = result.plot()

            # Đảm bảo frame đúng kích thước video gốc
            if annotated_frame.shape[1] != video_width or annotated_frame.shape[0] != video_height:
                annotated_frame = cv2.resize(annotated_frame, (video_width, video_height))

            video_writer.write(annotated_frame)

        frames.append({
            "frame_index": frame_index,
            "timestamp": round(float(timestamp), 3),
            "image_width": image_width,
            "image_height": image_height,
            "objects": objects
        })

        print(f"[VIDEO DETECTION] Frame={frame_index} | Objects={len(objects)}")

    if video_writer is not None:
        video_writer.release()

    processing_time_ms = int((time.time() - start_time) * 1000)

    print(f"[DONE] total_frames={len(frames)} processing_time_ms={processing_time_ms}")

    return {
        "media_type": "video",
        "model_version": "yolo_model",
        "fps": fps,
        "total_frames": total_frames if total_frames else len(frames),
        "processing_time_ms": processing_time_ms,
        "result_video_url": result_video_url,
        "frames": frames
    }