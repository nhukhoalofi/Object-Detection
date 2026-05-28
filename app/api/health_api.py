from fastapi import APIRouter

from app.config import settings


router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "success": True,
        "message": "Backend is running",
        "data": {
            "status": "ok",
            "version": settings.app_version
        }
    }