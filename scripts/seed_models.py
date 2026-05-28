import sys
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BASE_DIR))

from app.database import SessionLocal
from app.models.model_version import ModelVersion


def seed_models():
    db = SessionLocal()

    try:
        existing = db.query(ModelVersion).filter(
            ModelVersion.model_name == "yolo11n_custom",
            ModelVersion.version == "v1"
        ).first()

        if existing:
            print("Model already exists")
            return

        model = ModelVersion(
            model_name="yolo11n_custom",
            version="v1",
            task="detection",
            weight_path="weights/best.pt",
            classes_json=json.dumps({
                "0": "person",
                "1": "car",
                "2": "bicycle"
            }, ensure_ascii=False),
            metrics_json=json.dumps({
                "precision": 0.0,
                "recall": 0.0,
                "map50": 0.0,
                "map50_95": 0.0
            }, ensure_ascii=False),
            image_size=640,
            description="YOLO custom model for person, car, bicycle detection",
            is_active=True
        )

        db.add(model)
        db.commit()

        print("Seed model successfully")

    finally:
        db.close()


if __name__ == "__main__":
    seed_models()