from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, index=True, nullable=True)
    user_identifier = Column(String, unique=True, index=True, nullable=True) # "user_id" in prompt, can be generic
    name = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    location = Column(String, nullable=True)
    insurance_interest = Column(String, nullable=True)
    last_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sessions = relationship("Session", back_populates="user")

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    transcript = Column(Text, nullable=False)
    structured_data = Column(JSON, nullable=True)
    mode = Column(String, nullable=False) # "chat" or "voice"
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")
