"""
SQLAlchemy ORM models for PostgreSQL.

Design decisions:
  - UUID primary keys for global uniqueness and no sequential ID leakage
  - JSONB for structured_data (PostgreSQL native — faster than JSON, indexable)
  - server_default for timestamps (DB-side, immune to app timezone issues)
  - Indexed columns for fast lookups on phone_number and user_identifier
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.types import DateTime

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    # UUID primary key — no sequential guessing
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # Unique identifiers
    phone_number = Column(String(32), unique=True, index=True, nullable=True)
    user_identifier = Column(String(255), unique=True, index=True, nullable=True)

    # Profile fields
    name = Column(String(255), nullable=True)
    age = Column(Integer, nullable=True)
    occupation = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    insurance_interest = Column(String(255), nullable=True)
    last_summary = Column(Text, nullable=True)

    # Timestamps — server-side defaults, auto-updated
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    sessions = relationship(
        "Session",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} phone={self.phone_number} name={self.name}>"


class Session(Base):
    __tablename__ = "sessions"

    # UUID primary key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # External session identifier (VAPI call ID, or generated UUID for chat)
    session_id = Column(String(255), unique=True, index=True, nullable=False)

    # Foreign key to users
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Content
    transcript = Column(Text, nullable=False, default="")

    # JSONB — natively indexed, fast on PostgreSQL
    structured_data = Column(JSONB, nullable=True, default=dict)

    # Mode of interaction
    mode = Column(String(32), nullable=False, default="chat")
    # Possible values: "chat" | "voice" | "voice-emulated"

    # Timestamp
    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # Relationships
    user = relationship("User", back_populates="sessions")

    def __repr__(self) -> str:
        return f"<Session id={self.id} mode={self.mode} user_id={self.user_id}>"


# ── Composite indexes for common query patterns ──────────────────────────────
Index("ix_sessions_user_timestamp", Session.user_id, Session.timestamp)
