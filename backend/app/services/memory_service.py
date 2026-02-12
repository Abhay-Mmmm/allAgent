from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models import User, Session
import json

class MemoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_user(self, identifier: str, phone: str = None) -> User:
        # Logic to find by either identifier OR phone, prioritizing identifier if both provided but fallback to phone
        conditions = []
        if identifier:
            conditions.append(User.user_identifier == identifier)
        if phone:
            conditions.append(User.phone_number == phone)
        
        if not conditions:
            raise ValueError("Must provide identifier or phone")

        query = select(User).where((User.user_identifier == identifier) | (User.phone_number == phone))
        result = await self.db.execute(query)
        user = result.scalars().first()
        
        if not user:
            user = User(user_identifier=identifier, phone_number=phone)
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
        return user

    async def update_user_profile(self, user_id: int, structured_data: dict):
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        user = result.scalars().first()
        
        if user and structured_data:
            # Update fields if present in structured_data
            if "name" in structured_data: user.name = structured_data["name"]
            if "age" in structured_data: user.age = structured_data["age"]
            if "location" in structured_data: user.location = structured_data["location"]
            if "insurance_interest" in structured_data: user.insurance_interest = structured_data["insurance_interest"]
            
            # Simple summary update logic (append or replace - here just updating fields)
            # In a real app, you might use LLM to summarize here.
            
            await self.db.commit()
            await self.db.refresh(user)
        return user

    async def save_session(self, user_id: int, session_id: str, transcript: str, data: dict, mode: str):
        session = Session(
            user_id=user_id,
            session_id=session_id,
            transcript=transcript,
            structured_data=data,
            mode=mode
        )
        self.db.add(session)
        await self.db.commit()
    
    async def get_user_context(self, user_id: int) -> dict:
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        user = result.scalars().first()
        if not user:
            return {}
        
        return {
            "name": user.name,
            "age": user.age,
            "location": user.location,
            "interest": user.insurance_interest,
            "last_summary": user.last_summary
        }
