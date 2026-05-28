import os
import uuid
import shutil
from datetime import datetime

from fastapi import UploadFile


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov"}


def get_file_extension(filename: str) -> str:
    return os.path.splitext(filename)[1].lower()


def validate_image_file(file: UploadFile):
    ext = get_file_extension(file.filename)

    if ext not in IMAGE_EXTENSIONS:
        raise ValueError("Only jpg, jpeg, png images are supported")


def validate_video_file(file: UploadFile):
    ext = get_file_extension(file.filename)

    if ext not in VIDEO_EXTENSIONS:
        raise ValueError("Only mp4, avi, mov videos are supported")


def generate_stored_name(original_name: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    uid = uuid.uuid4().hex[:8]
    ext = get_file_extension(original_name)

    base = os.path.splitext(os.path.basename(original_name))[0]
    safe_base = base.replace(" ", "_")

    return f"{timestamp}_{uid}_{safe_base}{ext}"


def save_upload_file(file: UploadFile, target_dir: str) -> dict:
    os.makedirs(target_dir, exist_ok=True)

    stored_name = generate_stored_name(file.filename)
    file_path = os.path.join(target_dir, stored_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    return {
        "original_name": file.filename,
        "stored_name": stored_name,
        "file_path": file_path,
        "file_size": file_size
    }