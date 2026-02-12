from sqlalchemy.orm import Session
from app.models.user import User
from app.models.session import Session as SessionModel
from app.schemas.user import UserCreate, UserUpdate
from app.schemas.session import SessionCreate
from typing import Optional, List, Dict, Any
import logging
import json

async def get_user_by_phone(db: Session, phone_number: str) -> Optional[User]:
    """
    Retrieve user by phone number
    """
    try:
        return db.query(User).filter(User.phone_number == phone_number).first()
    except Exception as e:
        logging.error(f"Error retrieving user by phone: {str(e)}")
        return None

async def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """
    Retrieve user by user_id
    """
    try:
        return db.query(User).filter(User.user_id == user_id).first()
    except Exception as e:
        logging.error(f"Error retrieving user by ID: {str(e)}")
        return None

async def create_user(db: Session, user_data: UserCreate) -> User:
    """
    Create new user
    """
    try:
        user = User(**user_data.model_dump())
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        logging.error(f"Error creating user: {str(e)}")
        raise e

async def update_user(db: Session, user_identifier: str, update_data: dict) -> Optional[User]:
    """
    Update user by phone number or user_id
    """
    try:
        # Try to find by phone number first, then by user_id
        user = db.query(User).filter(User.phone_number == user_identifier).first()
        if not user:
            user = db.query(User).filter(User.user_id == user_identifier).first()
        
        if not user:
            # Create new user if not exists
            user_data = UserCreate(user_id=user_identifier, **update_data)
            return await create_user(db, user_data)
        
        # Update existing user
        for key, value in update_data.items():
            setattr(user, key, value)
        
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        logging.error(f"Error updating user: {str(e)}")
        raise e

async def get_user_sessions(db: Session, user_id: str) -> List[SessionModel]:
    """
    Retrieve all sessions for a user
    """
    try:
        user = await get_user_by_id(db, user_id)
        if not user:
            return []
        
        return db.query(SessionModel).filter(SessionModel.user_id == user.id).all()
    except Exception as e:
        logging.error(f"Error retrieving user sessions: {str(e)}")
        return []

async def create_session(db: Session, session_data: SessionCreate) -> SessionModel:
    """
    Create a new session
    """
    try:
        session = SessionModel(**session_data.model_dump())
        db.add(session)
        db.commit()
        db.refresh(session)
        return session
    except Exception as e:
        db.rollback()
        logging.error(f"Error creating session: {str(e)}")
        raise e

async def update_session(db: Session, session_id: str, update_data: dict) -> Optional[SessionModel]:
    """
    Update a session
    """
    try:
        session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
        if not session:
            return None
        
        for key, value in update_data.items():
            setattr(session, key, value)
        
        db.commit()
        db.refresh(session)
        return session
    except Exception as e:
        db.rollback()
        logging.error(f"Error updating session: {str(e)}")
        raise e

async def get_conversation_context(db: Session, user_identifier: str) -> Dict[str, Any]:
    """
    Get full context for conversation including user profile and history
    """
    try:
        # Get user by phone number or user_id
        user = await get_user_by_phone(db, user_identifier)
        if not user:
            user = await get_user_by_id(db, user_identifier)
        
        if not user:
            return {
                "is_new_user": True,
                "user_info": {},
                "conversation_history": [],
                "previous_summary": ""
            }
        
        # Get recent sessions
        recent_sessions = await get_user_sessions(db, str(user.id))
        
        # Prepare context
        context = {
            "is_new_user": False,
            "user_info": {
                "name": user.name,
                "age": user.age,
                "location": user.location,
                "insurance_interest": user.insurance_interest,
                "last_summary": user.last_summary
            },
            "conversation_history": [
                {
                    "timestamp": str(session.timestamp),
                    "mode": session.mode,
                    "summary": session.transcript[:200] + "..." if session.transcript and len(session.transcript) > 200 else (session.transcript or "")
                }
                for session in recent_sessions[-3:]  # Last 3 sessions
            ],
            "previous_summary": user.last_summary or ""
        }
        
        return context
    except Exception as e:
        logging.error(f"Error getting conversation context: {str(e)}")
        return {
            "is_new_user": True,
            "user_info": {},
            "conversation_history": [],
            "previous_summary": ""
        }

async def update_user_with_session_data(
    db: Session, 
    user_identifier: str, 
    session_data: Dict[str, Any]
) -> Optional[User]:
    """
    Update user profile with data extracted from session
    """
    try:
        # Get the user
        user = await get_user_by_phone(db, user_identifier)
        if not user:
            user = await get_user_by_id(db, user_identifier)
        
        if not user:
            return None
        
        # Update user with new information from session
        update_fields = {}
        
        # Extract and update basic info if provided in session data
        if 'name' in session_data and session_data['name']:
            update_fields['name'] = session_data['name']
        if 'age' in session_data and session_data['age']:
            update_fields['age'] = session_data['age']
        if 'location' in session_data and session_data['location']:
            update_fields['location'] = session_data['location']
        if 'insurance_interest' in session_data and session_data['insurance_interest']:
            update_fields['insurance_interest'] = session_data['insurance_interest']
        
        # Create a summary of the session for the last_summary field
        session_summary_parts = []
        if 'intent' in session_data and session_data['intent']:
            session_summary_parts.append(f"Intent: {session_data['intent']}")
        if 'topics' in session_data and session_data['topics']:
            session_summary_parts.append(f"Topics: {', '.join(session_data['topics'])}")
        
        if session_summary_parts:
            update_fields['last_summary'] = '; '.join(session_summary_parts)
        
        # Update the user with new information
        for key, value in update_fields.items():
            setattr(user, key, value)
        
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        logging.error(f"Error updating user with session data: {str(e)}")
        raise e