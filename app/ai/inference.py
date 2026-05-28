import math
import os
import shutil
import subprocess
import time
from typing import Any

import cv2
from ultralytics import YOLO


ALLOWED_CLASS_MAP = {
    "person": 0,
    "car": 1,
    "bicycle": 2
}

DEFAULT_VIDEO_FPS = 30.0


def resolve_model_path(model_path: str) -> str:
    if model_path and os.path.exists(model_path):
        return model_path

    if os.path.exists("weights/best.pt"):
        return "weights/best.pt"

    if os.path.exists("weights/yolo11n.pt"):
        return "weights/yolo11n.pt"

    return "yolo11n.pt"


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

    resolved_model_path = resolve_model_path(model_path)
    model = YOLO(resolved_model_path)

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

            if video_writer is not None:
                annotated_frame = result.plot()
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

        transcode_to_browser_mp4(temp_output_path, output_path)

        final_file_size = get_file_size(output_path)
        print(
            f"[VIDEO OUTPUT] final={output_path} final_file_size={final_file_size}"
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
