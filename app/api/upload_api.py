from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.media_file import MediaFile
from app.services.file_service import (
    validate_image_file,
    validate_video_file,
    save_upload_file
)


router = APIRouter()


@router.post("/uploads/image")
def upload_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
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

        return {
            "success": True,
            "message": "Image uploaded successfully",
            "data": {
                "media_id": media.id,
                "original_name": media.original_name,
                "stored_name": media.stored_name,
                "file_url": media.file_url,
                "media_type": media.media_type
            }
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail={
            "success": False,
            "message": "Invalid image file",
            "error": {
                "code": "INVALID_IMAGE",
                "details": str(e)
            }
        })


@router.post("/uploads/video")
def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
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

        return {
            "success": True,
            "message": "Video uploaded successfully",
            "data": {
                "media_id": media.id,
                "original_name": media.original_name,
                "stored_name": media.stored_name,
                "file_url": media.file_url,
                "media_type": media.media_type
            }
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail={
            "success": False,
            "message": "Invalid video file",
            "error": {
                "code": "INVALID_VIDEO",
                "details": str(e)
            }
        })
