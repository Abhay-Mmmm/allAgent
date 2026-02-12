from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any

class UserProfileBase(BaseModel):
    phone_number: Optional[str] = None
    user_identifier: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = None
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

class ChatRequest(BaseModel):
    user_identifier: str
    message: str
    phone_number: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    structured_data: Optional[Dict[str, Any]] = None

class VoiceSessionStartRequest(BaseModel):
    phone_number: str
    user_identifier: Optional[str] = None

class VoiceSessionResponse(BaseModel):
    session_id: str
    url: str  # Assuming this returns a connection URL or similar depending on client SDK
    status: str

class VoiceChatRequest(BaseModel):
    user_identifier: str
    transcript: str
    phone_number: Optional[str] = None

class VoiceChatResponse(BaseModel):
    text_response: str
