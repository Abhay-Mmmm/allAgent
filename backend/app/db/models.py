"""
SQLAlchemy ORM models for the Outbound AI Sales Calling Platform.

Tables:
  - Lead          — enriched prospect profile (was: User)
  - CallSession   — completed call transcript + extracted data (was: Session)
  - CallQueue     — outbound call queue with status tracking

Design decisions:
  - UUID primary keys for global uniqueness
  - JSONB for structured_data (native PostgreSQL — fast + indexable)
  - server_default timestamps (DB-side, immune to app timezone issues)
  - Indexed on phone_number, status for fast queue processing
"""
import uuid

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


class Lead(Base):
    """Enriched prospect / lead profile built from outbound call transcripts."""

    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Contact
    phone_number = Column(String(32), unique=True, index=True, nullable=False)

    # Profile — filled progressively as calls are processed
    name             = Column(String(255), nullable=True)
    age              = Column(Integer, nullable=True)
    occupation       = Column(String(255), nullable=True)
    location         = Column(String(255), nullable=True)
    insurance_interest = Column(String(255), nullable=True)  # health | life | crop | vehicle

    # CRM status
    lead_status = Column(
        String(64), nullable=False, default="new"
    )  # new | contacted | interested | not_interested | converted

    # Running memory for multi-call context
    last_summary = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    call_sessions = relationship(
        "CallSession",
        back_populates="lead",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Lead id={self.id} phone={self.phone_number} name={self.name}>"


class CallSession(Base):
    """Stores the transcript and extracted structured data for each completed call."""

    __tablename__ = "call_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # VAPI's call ID — used to de-duplicate webhook retries
    vapi_call_id = Column(String(255), unique=True, index=True, nullable=True)

    # FK → leads
    lead_id = Column(
        UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    transcript     = Column(Text, nullable=False, default="")
    structured_data = Column(JSONB, nullable=True, default=dict)  # LLM-extracted fields
    call_duration  = Column(Integer, nullable=True)               # seconds, from VAPI

    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    lead = relationship("Lead", back_populates="call_sessions")

    def __repr__(self) -> str:
        return f"<CallSession id={self.id} lead_id={self.lead_id}>"


class CallQueue(Base):
    """Outbound call queue — tracks state from pending → calling → completed/failed."""

    __tablename__ = "call_queue"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    phone_number = Column(String(32), nullable=False, index=True)

    status = Column(
        String(32), nullable=False, default="pending", index=True
    )  # pending | calling | completed | failed

    attempts = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<CallQueue id={self.id} phone={self.phone_number} status={self.status}>"


# ── Composite indexes for common query patterns ──────────────────────────────
Index("ix_call_sessions_lead_timestamp", CallSession.lead_id, CallSession.timestamp)
Index("ix_call_queue_status_created", CallQueue.status, CallQueue.created_at)
