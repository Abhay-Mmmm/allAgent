from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Session(Base):
    __tablename__ = "sessions"

    session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    transcript = Column(Text)
    structured_data = Column(JSON)
    mode = Column(String(10))  # 'chat' or 'voice'
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "session_id": str(self.session_id),
            "user_id": str(self.user_id),
            "transcript": self.transcript,
            "structured_data": self.structured_data,
            "mode": self.mode,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }