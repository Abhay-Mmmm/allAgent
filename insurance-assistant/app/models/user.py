from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_number = Column(String(15), unique=True, nullable=True)
    user_id = Column(String(50), unique=True, nullable=True)
    name = Column(String(100))
    age = Column(Integer)
    location = Column(Text)
    insurance_interest = Column(String(50))
    last_summary = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def to_dict(self):
        return {
            "id": str(self.id),
            "phone_number": self.phone_number,
            "user_id": self.user_id,
            "name": self.name,
            "age": self.age,
            "location": self.location,
            "insurance_interest": self.insurance_interest,
            "last_summary": self.last_summary,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }