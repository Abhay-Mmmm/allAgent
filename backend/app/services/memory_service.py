"""
MemoryService — Persistent caller/user profile and session management.

Works with the Railway PostgreSQL database through SQLAlchemy async sessions.
All user lookups use UUID primary keys (no integer IDs).
"""
import logging
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.models import User, Session

logger = logging.getLogger(__name__)


class MemoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ──────────────────────────────────────────────
    #  USER MANAGEMENT
    # ──────────────────────────────────────────────

    async def get_or_create_user(
        self,
        identifier: Optional[str] = None,
        phone: Optional[str] = None,
    ) -> User:
        """
        Find an existing user by identifier OR phone number.
        Creates a new user if neither matches.
        """
        if not identifier and not phone:
            raise ValueError("Must provide at least one of: identifier, phone")

        # Build OR query for either match
        conditions = []
        if identifier:
            conditions.append(User.user_identifier == identifier)
        if phone:
            conditions.append(User.phone_number == phone)

        from sqlalchemy import or_
        query = select(User).where(or_(*conditions))
        result = await self.db.execute(query)
        user = result.scalars().first()

        if not user:
            user = User(
                id=uuid.uuid4(),
                user_identifier=identifier,
                phone_number=phone,
            )
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
            logger.info(f"Created new user: id={user.id}, phone={phone}, identifier={identifier}")

        return user

    async def update_user_profile(self, user_id: uuid.UUID, structured_data: dict) -> Optional[User]:
        """
        Update user profile fields from a structured data dict.
        Only updates fields that are present AND truthy in the dict.
        """
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()

        if not user or not structured_data:
            return user

        field_map = {
            "name": "name",
            "age": "age",
            "occupation": "occupation",
            "location": "location",
            "insurance_interest": "insurance_interest",
        }

        updated_fields = []
        for key, attr in field_map.items():
            if key in structured_data and structured_data[key]:
                setattr(user, attr, structured_data[key])
                updated_fields.append(key)

        if updated_fields:
            await self.db.commit()
            await self.db.refresh(user)
            logger.info(f"Updated profile for user {user_id}: fields={updated_fields}")

        return user

    async def update_last_summary(self, user_id: uuid.UUID, summary: str) -> Optional[User]:
        """
        Persist the last conversation summary for memory injection
        into the next VAPI session prompt.
        """
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()

        if user and summary:
            user.last_summary = summary
            await self.db.commit()
            await self.db.refresh(user)
            logger.info(f"Updated last_summary for user {user_id}")

        return user

    # ──────────────────────────────────────────────
    #  SESSION MANAGEMENT
    # ──────────────────────────────────────────────

    async def save_session(
        self,
        user_id: uuid.UUID,
        session_id: str,
        transcript: str,
        data: dict,
        mode: str,
    ) -> Session:
        """
        Persist a conversation session record.
        Handles de-duplication: if session_id already exists, it's a no-op.
        """
        # Check for existing session to avoid unique constraint errors
        existing = await self.db.execute(
            select(Session).where(Session.session_id == session_id)
        )
        if existing.scalars().first():
            logger.debug(f"Session {session_id} already exists — skipping save")
            return

        session = Session(
            id=uuid.uuid4(),
            user_id=user_id,
            session_id=session_id,
            transcript=transcript or "",
            structured_data=data or {},
            mode=mode,
        )
        self.db.add(session)
        await self.db.commit()
        logger.info(f"Saved session {session_id} for user {user_id} (mode={mode})")
        return session

    # ──────────────────────────────────────────────
    #  CONTEXT RETRIEVAL
    # ──────────────────────────────────────────────

    async def get_user_context(self, user_id: uuid.UUID) -> dict:
        """
        Return all known profile fields for LLM prompt injection.
        Returns empty dict if user not found.
        """
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()

        if not user:
            return {}

        return {
            "name": user.name,
            "age": user.age,
            "occupation": user.occupation,
            "location": user.location,
            "interest": user.insurance_interest,
            "last_summary": user.last_summary,
        }
