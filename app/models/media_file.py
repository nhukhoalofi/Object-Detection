from sqlalchemy import Column, BigInteger, Integer, String, Unicode, UnicodeText, Float, DateTime
from sqlalchemy.sql import func

from app.database import Base


class MediaFile(Base):
    __tablename__ = "media_files"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)

    original_name = Column(Unicode(255), nullable=False)
    stored_name = Column(Unicode(255), nullable=False)
    file_path = Column(UnicodeText, nullable=False)
    file_url = Column(UnicodeText)

    media_type = Column(String(20), nullable=False)
    mime_type = Column(Unicode(100))
    file_size = Column(BigInteger)

    width = Column(Integer)
    height = Column(Integer)
    duration = Column(Float)
    fps = Column(Float)
    total_frames = Column(Integer)

    created_at = Column(DateTime, server_default=func.sysdatetime())
