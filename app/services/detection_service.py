import json
import os
import time
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
    progress_state = {
        "last_progress": None,
        "last_processed_frames": None,
        "last_commit_time": 0.0
    }

    try:
        job = db.query(DetectionJob).filter(
            DetectionJob.job_id == job_id
        ).first()

        if not job:
            return

        job.status = "processing"
        job.started_at = datetime.now()
        job.progress = 1
        job.processed_frames = 0
        db.commit()

        def update_progress(payload: dict):
            progress = int(payload.get("progress") or 1)
            progress = max(1, min(99, progress))
            total_frames = int(payload.get("total_frames") or 0)
            processed_frames = int(payload.get("processed_frames") or 0)
            now = time.monotonic()

            should_commit = (
                progress != progress_state["last_progress"]
                or processed_frames != progress_state["last_processed_frames"]
                or now - progress_state["last_commit_time"] >= 1.0
            )

            if not should_commit:
                return

            job.total_frames = total_frames or job.total_frames
            job.processed_frames = processed_frames
            job.progress = progress
            db.commit()

            progress_state["last_progress"] = progress
            progress_state["last_processed_frames"] = processed_frames
            progress_state["last_commit_time"] = now

            print(
                f"[VIDEO JOB PROGRESS] job_id={job_id} "
                f"stage={payload.get('stage')} "
                f"processed_frames={processed_frames}/{job.total_frames or 0} "
                f"progress={progress}%"
            )

        result = detect_video(
            video_path=video_path,
            model_path=model_path,
            confidence=confidence,
            iou=iou,
            enable_tracking=enable_tracking,
            enable_3d=enable_3d,
            output_path=output_video_path,
            progress_callback=update_progress
        )

        os.makedirs("outputs/json", exist_ok=True)
        result_path = f"outputs/json/{job_id}_result.json"

        with open(result_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        job.status = "completed"
        job.progress = 100
        job.total_frames = result.get("total_frames")
        job.processed_frames = result.get("processed_frames") or result.get("total_frames")
        job.processing_time_ms = result.get("processing_time_ms")
        job.result_json_path = result_path
        job.completed_at = datetime.now()

        db.commit()

    except Exception as e:
        db.rollback()
        print(f"[VIDEO JOB FAILED] job_id={job_id} error={e}")

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
