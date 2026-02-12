from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class UserBase(BaseModel):
    phone_number: Optional[str] = None
    user_id: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = None
    location: Optional[str] = None
    insurance_interest: Optional[str] = None
    last_summary: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    location: Optional[str] = None
    insurance_interest: Optional[str] = None
    last_summary: Optional[str] = None

class UserResponse(UserBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True