import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.model_version import ModelVersion


router = APIRouter()


@router.get("/models")
def get_models(db: Session = Depends(get_db)):
    models = db.query(ModelVersion).all()

    data = []

    for model in models:
        classes = json.loads(model.classes_json) if model.classes_json else {}
        metrics = json.loads(model.metrics_json) if model.metrics_json else {}

        data.append({
            "id": model.id,
            "model_name": model.model_name,
            "version": model.version,
            "task": model.task,
            "classes": classes,
            "metrics": metrics,
            "image_size": model.image_size,
            "is_active": model.is_active
        })

    return {
        "success": True,
        "message": "Models fetched successfully",
        "data": data
    }