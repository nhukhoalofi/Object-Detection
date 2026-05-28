import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine

from app.api.health_api import router as health_router
from app.api.model_api import router as model_router
from app.api.upload_api import router as upload_router
from app.api.detection_api import router as detection_router
from app.api.job_api import router as job_router

from app.models.media_file import MediaFile
from app.models.model_version import ModelVersion
from app.models.detection_job import DetectionJob


os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.output_dir, exist_ok=True)
os.makedirs(settings.weights_dir, exist_ok=True)

os.makedirs("uploads/images", exist_ok=True)
os.makedirs("uploads/videos", exist_ok=True)
os.makedirs("outputs/json", exist_ok=True)
os.makedirs("outputs/images", exist_ok=True)
os.makedirs("outputs/videos", exist_ok=True)


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
app.mount("/outputs", StaticFiles(directory=settings.output_dir), name="outputs")


app.include_router(health_router, prefix="/api", tags=["Health"])
app.include_router(model_router, prefix="/api", tags=["Models"])
app.include_router(upload_router, prefix="/api", tags=["Uploads"])
app.include_router(detection_router, prefix="/api", tags=["Detections"])
app.include_router(job_router, prefix="/api", tags=["Jobs"])