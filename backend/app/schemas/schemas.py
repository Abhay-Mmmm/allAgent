"""
Pydantic schemas for the Outbound AI Sales Calling Platform.

Groups:
  - Lead schemas      — CRUD for lead profiles
  - Queue schemas     — Call queue management
  - CallSession       — Completed call records
  - Webhook schemas   — VAPI webhook payloads (internal use)
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
    vapi_call_id:    Optional[str] = None
    lead_id:         UUID
    transcript:      str
    structured_data: Optional[Dict[str, Any]] = None
    call_duration:   Optional[int] = None
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
    status:       str
    attempts:     int
    created_at:   datetime
    updated_at:   datetime
    model_config = ConfigDict(from_attributes=True)


class QueueStatsResponse(BaseModel):
    pending:   int
    calling:   int
    completed: int
    failed:    int
    total:     int


class AddToQueueRequest(BaseModel):
    phone_numbers: List[str]

    @field_validator("phone_numbers")
    @classmethod
    def validate_numbers(cls, v: List[str]) -> List[str]:
        cleaned = [n.strip() for n in v if n.strip()]
        if not cleaned:
            raise ValueError("At least one phone number is required")
        return cleaned


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
    skipped:   int
    errors:    int
    message:   str
