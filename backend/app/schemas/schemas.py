"""
Pydantic schemas for the Outbound AI Sales Calling Platform.

Groups:
  - Lead schemas      — CRUD for lead profiles
  - Queue schemas     — Call queue management
  - CallSession       — Completed call records
  - Webhook schemas   — Twilio status callbacks (internal use)
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


# ──────────────────────────────────────────────
#  LEAD SCHEMAS
# ──────────────────────────────────────────────

class LeadBase(BaseModel):
    phone_number:       str
    name:               Optional[str] = None
    age:                Optional[int] = None
    occupation:         Optional[str] = None
    location:           Optional[str] = None
    insurance_interest: Optional[str] = None
    lead_status:        Optional[str] = "new"
    last_summary:       Optional[str] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    name:               Optional[str] = None
    phone_number:       Optional[str] = None
    age:                Optional[int] = None
    occupation:         Optional[str] = None
    location:           Optional[str] = None
    insurance_interest: Optional[str] = None
    lead_status:        Optional[str] = None
    last_summary:       Optional[str] = None


class LeadResponse(LeadBase):
    id:         UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class LeadListResponse(BaseModel):
    leads:  List[LeadResponse]
    total:  int
    page:   int
    limit:  int


# ──────────────────────────────────────────────
#  CALL SESSION SCHEMAS
# ──────────────────────────────────────────────

class CallSessionResponse(BaseModel):
    id:              UUID
    call_sid:        Optional[str] = None   # Twilio CallSid
    lead_id:         UUID
    transcript:      str
    structured_data: Optional[Dict[str, Any]] = None
    call_duration:   Optional[int] = None
    call_status:     Optional[str] = None   # completed | no_answer | busy | failed | canceled
    timestamp:       datetime
    model_config = ConfigDict(from_attributes=True)


class CallSessionListResponse(BaseModel):
    calls: List[CallSessionResponse]
    total: int
    page:  int
    limit: int


# ──────────────────────────────────────────────
#  CALL QUEUE SCHEMAS
# ──────────────────────────────────────────────

class QueueItemResponse(BaseModel):
    id:           UUID
    phone_number: str
    lead_name:    Optional[str] = None
    status:       str
    attempts:     int
    created_at:   datetime
    updated_at:   datetime
    model_config = ConfigDict(from_attributes=True)


class QueueStatsResponse(BaseModel):
    pending:   int
    calling:   int
    completed: int
    no_answer: int = 0
    failed:    int
    total:     int


class QueueEntry(BaseModel):
    name: Optional[str] = None
    phone_number: str


class AddToQueueRequest(BaseModel):
    phone_numbers: Optional[List[str]] = None
    entries: Optional[List[QueueEntry]] = None

    @field_validator("phone_numbers", mode="before")
    @classmethod
    def validate_numbers(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        return [n.strip() for n in v if n.strip()]

    def get_entries(self) -> List[QueueEntry]:
        """Normalise both input formats into a list of QueueEntry."""
        result: List[QueueEntry] = []
        if self.entries:
            result.extend(self.entries)
        if self.phone_numbers:
            result.extend(QueueEntry(phone_number=p) for p in self.phone_numbers)
        return result


class QueueListResponse(BaseModel):
    items:  List[QueueItemResponse]
    stats:  QueueStatsResponse
    total:  int
    page:   int
    limit:  int


# ──────────────────────────────────────────────
#  CAMPAIGN SCHEMAS
# ──────────────────────────────────────────────

class CampaignStartResponse(BaseModel):
    campaign_id: str
    status:      str
    message:     str


# ──────────────────────────────────────────────
#  CSV IMPORT SCHEMAS
# ──────────────────────────────────────────────

class ImportResponse(BaseModel):
    imported:  int
    updated:   int = 0
    skipped:   int
    errors:    int
    message:   str
