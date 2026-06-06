from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "3D Object Detection Backend"
    app_version: str = "1.0.0"
    env: str = "development"

    database_url: str

    upload_dir: str = "uploads"
    output_dir: str = "outputs"
    weights_dir: str = "weights"

    default_model_path: str = "weights/bdd100k_best.pt"
    default_pose_model_path: str = "weights/best.pt"
    default_confidence: float = 0.25
    default_iou: float = 0.45

    max_image_size_mb: int = 20
    max_video_size_mb: int = 200

    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )


settings = Settings()
