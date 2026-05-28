import os
import re
import shutil
import unicodedata
import uuid
from datetime import datetime
from urllib.parse import quote

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


def sanitize_filename_base(filename: str) -> str:
    base = os.path.splitext(os.path.basename(filename or ""))[0]
    base = base.replace("đ", "d").replace("Đ", "D")
    normalized = unicodedata.normalize("NFKD", base)
    ascii_base = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_base = re.sub(r"[^A-Za-z0-9._-]+", "_", ascii_base)
    ascii_base = re.sub(r"_+", "_", ascii_base).strip("._-")

    return ascii_base or "upload"


def generate_stored_name(original_name: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    uid = uuid.uuid4().hex[:8]
    ext = get_file_extension(original_name)

    safe_base = sanitize_filename_base(original_name)

    return f"{timestamp}_{uid}_{safe_base}{ext}"


def build_file_url(base_url: str, stored_name: str) -> str:
    return f"{base_url.rstrip('/')}/{quote(stored_name)}"


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
        "file_url": build_file_url(target_dir.replace(os.sep, "/"), stored_name),
        "file_size": file_size
    }
