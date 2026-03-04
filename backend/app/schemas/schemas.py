from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Dict, Any


# ──────────────────────────────────────────────
#  USER PROFILE SCHEMAS
# ──────────────────────────────────────────────

class UserProfileBase(BaseModel):
    phone_number: Optional[str] = None
    user_identifier: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = None
    occupation: Optional[str] = None
    location: Optional[str] = None
    insurance_interest: Optional[str] = None
    last_summary: Optional[str] = None

class UserProfileCreate(UserProfileBase):
    pass

class UserProfile(UserProfileBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ──────────────────────────────────────────────
#  CHAT SCHEMAS (unchanged)
# ──────────────────────────────────────────────

class ChatRequest(BaseModel):
    user_identifier: str
    message: str
    phone_number: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    structured_data: Optional[Dict[str, Any]] = None


# ──────────────────────────────────────────────
#  VOICE-EMULATED SCHEMAS (browser STT/TTS)
# ──────────────────────────────────────────────

class VoiceChatRequest(BaseModel):
    user_identifier: str
    transcript: str
    phone_number: Optional[str] = None

class VoiceChatResponse(BaseModel):
    text_response: str


# ──────────────────────────────────────────────
#  VAPI / CALLER PROFILE SCHEMAS
# ──────────────────────────────────────────────

class CallerProfileResponse(BaseModel):
    """Returned by GET /caller-profile/{phone_number}"""
    phone_number: str
    name: Optional[str] = None
    age: Optional[int] = None
    occupation: Optional[str] = None
    location: Optional[str] = None
    insurance_interest: Optional[str] = None
    last_summary: Optional[str] = None
