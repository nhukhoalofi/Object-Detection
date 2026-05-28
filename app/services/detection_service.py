import json
import os
from datetime import datetime

from app.database import SessionLocal
from app.models.detection_job import DetectionJob
from app.ai.inference import detect_video


def process_video_job(
    job_id: str,
    video_path: str,
    model_path: str,
    confidence: float,
    iou: float,
    enable_tracking: bool,
    enable_3d: bool,
    output_video_path: str | None = None
):
    db = SessionLocal()

    try:
        job = db.query(DetectionJob).filter(
            DetectionJob.job_id == job_id
        ).first()

        if not job:
            return

        job.status = "processing"
        job.started_at = datetime.now()
        job.progress = 1
        db.commit()

        result = detect_video(
            video_path=video_path,
            model_path=model_path,
            confidence=confidence,
            iou=iou,
            enable_tracking=enable_tracking,
            enable_3d=enable_3d,
            output_path=output_video_path
        )

        os.makedirs("outputs/json", exist_ok=True)
        result_path = f"outputs/json/{job_id}_result.json"

        with open(result_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        job.status = "completed"
        job.progress = 100
        job.total_frames = result.get("total_frames")
        job.processed_frames = result.get("total_frames")
        job.processing_time_ms = result.get("processing_time_ms")
        job.result_json_path = result_path
        job.completed_at = datetime.now()

        db.commit()

    except Exception as e:
        job = db.query(DetectionJob).filter(
            DetectionJob.job_id == job_id
        ).first()

        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.now()
            db.commit()

    finally:
        db.close()