import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BASE_DIR))

from app.database import SessionLocal
from app.models.model_version import ModelVersion


MODELS = [
    {
        "model_name": "bdd100k_detection_v1",
        "version": "v1",
        "task": "detection",
        "weight_path": "weights/bdd100k_best.pt",
        "classes": {
            "0": "person",
            "1": "rider",
            "2": "car",
            "3": "bus",
            "4": "truck",
            "5": "bike",
            "6": "motor",
            "7": "traffic light",
            "8": "traffic sign",
            "9": "train"
        },
        "metrics": {},
        "description": "BDD100K object detection model for traffic scene classes."
    },
    {
        "model_name": "human_pose_v1",
        "version": "v1",
        "task": "pose",
        "weight_path": "weights/best.pt",
        "classes": {
            "0": "person"
        },
        "metrics": {},
        "description": "Human pose estimation model with 17 COCO keypoints."
    }
]


def upsert_model(db, payload: dict) -> None:
    model = db.query(ModelVersion).filter(
        ModelVersion.model_name == payload["model_name"],
        ModelVersion.version == payload["version"]
    ).first()

    if not model:
        model = ModelVersion(
            model_name=payload["model_name"],
            version=payload["version"],
            task=payload["task"],
            weight_path=payload["weight_path"],
            classes_json="{}",
            metrics_json="{}",
            image_size=640,
            description=payload["description"],
            is_active=True
        )
        db.add(model)

    model.task = payload["task"]
    model.weight_path = payload["weight_path"]
    model.classes_json = json.dumps(payload["classes"], ensure_ascii=False)
    model.metrics_json = json.dumps(payload["metrics"], ensure_ascii=False)
    model.image_size = 640
    model.description = payload["description"]
    model.is_active = True


def seed_models():
    db = SessionLocal()

    try:
        for payload in MODELS:
            upsert_model(db, payload)

        db.commit()
        print("Seed models successfully")

    finally:
        db.close()


if __name__ == "__main__":
    seed_models()
