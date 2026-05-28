from sqlalchemy import Column, BigInteger, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func

from app.database import Base


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)

    model_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    task = Column(String(50), nullable=False)

    weight_path = Column(Text, nullable=False)
    classes_json = Column(Text, nullable=False)
    metrics_json = Column(Text)

    image_size = Column(Integer, default=640)
    description = Column(Text)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.sysdatetime())