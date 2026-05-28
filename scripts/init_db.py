import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BASE_DIR))

from app.database import Base, engine

from app.models.media_file import MediaFile
from app.models.model_version import ModelVersion
from app.models.detection_job import DetectionJob


def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully")


if __name__ == "__main__":
    init_db()