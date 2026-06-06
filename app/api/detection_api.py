import json
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.media_file import MediaFile
from app.models.detection_job import DetectionJob
from app.models.model_version import ModelVersion
from app.services.file_service import validate_image_file, validate_video_file, save_upload_file
from app.services.detection_service import process_video_job
from app.ai.inference import detect_image


router = APIRouter()


def resolve_detection_model_path(db: Session, model_id: int | None) -> str:
    if model_id is None:
        return settings.default_model_path

    model = db.query(ModelVersion).filter(
        ModelVersion.id == model_id,
        ModelVersion.is_active.is_(True)
    ).first()

    if not model:
        return settings.default_model_path

    if "detect" not in str(model.task or "").lower():
        return settings.default_model_path

    return model.weight_path or settings.default_model_path


@router.post("/detections/image")
def detect_image_api(
    file: UploadFile = File(...),
    model_id: int | None = Form(None),
    confidence: float = Form(0.25),
    iou: float = Form(0.45),
    enable_3d: bool = Form(False),
    enable_pose: bool = Form(False),
    db: Session = Depends(get_db)
):
    try:
        validate_image_file(file)

        saved = save_upload_file(file, "uploads/images")

        media = MediaFile(
            original_name=saved["original_name"],
            stored_name=saved["stored_name"],
            file_path=saved["file_path"],
            file_url=f"/{saved['file_url']}",
            media_type="image",
            mime_type=file.content_type,
            file_size=saved["file_size"]
        )

        db.add(media)
        db.commit()
        db.refresh(media)

        job_id = f"job_img_{uuid.uuid4().hex[:10]}"

        job = DetectionJob(
            job_id=job_id,
            media_file_id=media.id,
            model_version_id=model_id,
            status="processing",
            progress=0,
            confidence_threshold=confidence,
            iou_threshold=iou,
            enable_tracking=False,
            enable_3d=enable_3d,
            enable_pose=enable_pose,
            started_at=datetime.now()
        )

        db.add(job)
        db.commit()

        output_filename = f"{job_id}_detected.jpg"
        output_path = os.path.join("outputs", "images", output_filename)
        detection_model_path = resolve_detection_model_path(db, model_id)

        result = detect_image(
            image_path=media.file_path,
            model_path=detection_model_path,
            pose_model_path=settings.default_pose_model_path,
            confidence=confidence,
            iou=iou,
            enable_3d=enable_3d,
            enable_pose=enable_pose,
            output_path=output_path
        )

        os.makedirs("outputs/json", exist_ok=True)
        result_path = f"outputs/json/{job_id}_result.json"

        with open(result_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        job.status = "completed"
        job.progress = 100
        job.processing_time_ms = result.get("processing_time_ms")
        job.result_json_path = result_path
        job.completed_at = datetime.now()

        db.commit()

        return {
            "success": True,
            "message": "Image detection completed",
            "data": {
                "job_id": job_id,
                "media_type": "image",
                "model_version": result.get("model_version"),
                "processing_time_ms": result.get("processing_time_ms"),
                "result_image_url": result.get("result_image_url"),
                "frame": result["frames"][0] if result.get("frames") else None
            }
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail={
            "success": False,
            "message": "Invalid file format",
            "error": {
                "code": "INVALID_IMAGE",
                "details": str(e)
            }
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "success": False,
            "message": "Image detection failed",
            "error": {
                "code": "DETECTION_ERROR",
                "details": str(e)
            }
        })


@router.post("/detections/video")
def detect_video_api(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    model_id: int | None = Form(None),
    confidence: float = Form(0.25),
    iou: float = Form(0.45),
    enable_tracking: bool = Form(True),
    enable_3d: bool = Form(False),
    enable_pose: bool = Form(False),
    db: Session = Depends(get_db)
):
    try:
        validate_video_file(file)

        saved = save_upload_file(file, "uploads/videos")

        media = MediaFile(
            original_name=saved["original_name"],
            stored_name=saved["stored_name"],
            file_path=saved["file_path"],
            file_url=f"/{saved['file_url']}",
            media_type="video",
            mime_type=file.content_type,
            file_size=saved["file_size"]
        )

        db.add(media)
        db.commit()
        db.refresh(media)

        job_id = f"job_vid_{uuid.uuid4().hex[:10]}"

        job = DetectionJob(
            job_id=job_id,
            media_file_id=media.id,
            model_version_id=model_id,
            status="pending",
            progress=0,
            confidence_threshold=confidence,
            iou_threshold=iou,
            enable_tracking=enable_tracking,
            enable_3d=enable_3d,
            enable_pose=enable_pose
        )

        db.add(job)
        db.commit()

        output_video_filename = f"{job_id}_detected.mp4"
        output_video_path = os.path.join("outputs", "videos", output_video_filename)
        result_video_url = f"/outputs/videos/{output_video_filename}"
        detection_model_path = resolve_detection_model_path(db, model_id)

        background_tasks.add_task(
            process_video_job,
            job_id=job_id,
            video_path=media.file_path,
            model_path=detection_model_path,
            pose_model_path=settings.default_pose_model_path,
            confidence=confidence,
            iou=iou,
            enable_tracking=enable_tracking,
            enable_3d=enable_3d,
            enable_pose=enable_pose,
            output_video_path=output_video_path
        )

        return {
            "success": True,
            "message": "Video detection job created",
            "data": {
                "job_id": job_id,
                "status": "processing",
                "media_type": "video",
                "websocket_url": f"/ws/jobs/{job_id}",
                "result_url": f"/api/jobs/{job_id}/result",
                "result_video_url": result_video_url
            }
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail={
            "success": False,
            "message": "Invalid file format",
            "error": {
                "code": "INVALID_VIDEO",
                "details": str(e)
            }
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "success": False,
            "message": "Video detection failed",
            "error": {
                "code": "DETECTION_ERROR",
                "details": str(e)
            }
        })
