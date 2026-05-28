import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.detection_job import DetectionJob


router = APIRouter()


@router.get("/jobs/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(DetectionJob).filter(
        DetectionJob.job_id == job_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail={
            "success": False,
            "message": "Job not found",
            "error": {
                "code": "JOB_NOT_FOUND",
                "details": f"No job found with job_id={job_id}"
            }
        })

    return {
        "success": True,
        "message": "Job status fetched successfully",
        "data": {
            "job_id": job.job_id,
            "status": job.status,
            "progress": job.progress,
            "total_frames": job.total_frames,
            "processed_frames": job.processed_frames,
            "created_at": str(job.created_at) if job.created_at else None,
            "started_at": str(job.started_at) if job.started_at else None,
            "completed_at": str(job.completed_at) if job.completed_at else None,
            "error_message": job.error_message
        }
    }


@router.get("/jobs/{job_id}/result")
def get_job_result(job_id: str, db: Session = Depends(get_db)):
    job = db.query(DetectionJob).filter(
        DetectionJob.job_id == job_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail={
            "success": False,
            "message": "Job not found",
            "error": {
                "code": "JOB_NOT_FOUND",
                "details": f"No job found with job_id={job_id}"
            }
        })

    if job.status != "completed":
        raise HTTPException(status_code=400, detail={
            "success": False,
            "message": "Job is not completed yet",
            "error": {
                "code": "JOB_NOT_COMPLETED",
                "details": f"Current job status is {job.status}"
            }
        })

    if not job.result_json_path:
        raise HTTPException(status_code=404, detail={
            "success": False,
            "message": "Result file not found",
            "error": {
                "code": "RESULT_NOT_FOUND",
                "details": "result_json_path is empty"
            }
        })

    with open(job.result_json_path, "r", encoding="utf-8") as f:
        result = json.load(f)

    return {
        "success": True,
        "message": "Detection result fetched successfully",
        "data": {
            "job_id": job.job_id,
            **result
        }
    }