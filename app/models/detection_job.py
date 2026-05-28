from sqlalchemy import Column, BigInteger, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class DetectionJob(Base):
    __tablename__ = "detection_jobs"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    job_id = Column(String(100), unique=True, nullable=False, index=True)

    media_file_id = Column(BigInteger, ForeignKey("media_files.id"), nullable=False)
    model_version_id = Column(BigInteger, ForeignKey("model_versions.id"), nullable=True)

    status = Column(String(30), default="pending")
    progress = Column(Integer, default=0)

    confidence_threshold = Column(Float, default=0.25)
    iou_threshold = Column(Float, default=0.45)

    enable_tracking = Column(Boolean, default=False)
    enable_3d = Column(Boolean, default=False)
    enable_pose = Column(Boolean, default=False)

    total_frames = Column(Integer)
    processed_frames = Column(Integer, default=0)
    processing_time_ms = Column(Integer)

    error_message = Column(Text)
    result_json_path = Column(Text)

    created_at = Column(DateTime, server_default=func.sysdatetime())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)