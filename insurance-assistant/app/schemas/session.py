from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

class SessionBase(BaseModel):
    user_id: uuid.UUID
    transcript: Optional[str] = None
    structured_data: Optional[Dict[str, Any]] = None
    mode: str  # 'chat' or 'voice'

class SessionCreate(SessionBase):
    user_id: uuid.UUID
    mode: str

class SessionUpdate(BaseModel):
    transcript: Optional[str] = None
    structured_data: Optional[Dict[str, Any]] = None

class SessionResponse(SessionBase):
    session_id: uuid.UUID
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    phone_number: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    user_id: str
    session_id: str
    structured_data: Optional[Dict[str, Any]] = None

class VoiceSessionRequest(BaseModel):
    user_id: Optional[str] = None
    phone_number: Optional[str] = None
    session_type: str = "voice"

class VoiceSessionResponse(BaseModel):
    session_id: str
    user_id: str
    status: str
    ws_url: Optional[str] = None