from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.schemas.session import ChatRequest, ChatResponse
from app.services.openai_service import openai_service
from app.services.memory_service import (
    get_user_by_phone, get_user_by_id, create_user, update_user_with_session_data, create_session
)
import uuid

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Chat endpoint that processes text input and returns text response
    Uses OpenAI for reasoning with shared memory
    """
    try:
        # Determine user identifier
        user_identifier = request.user_id or request.phone_number
        if not user_identifier:
            raise HTTPException(status_code=400, detail="Either user_id or phone_number must be provided")
        
        # Get or create user
        user = await get_user_by_phone(db, request.phone_number) if request.phone_number else None
        if not user and request.user_id:
            user = await get_user_by_id(db, request.user_id)
        
        if not user:
            # Create new user
            user_data = {
                "phone_number": request.phone_number,
                "user_id": request.user_id
            }
            user = await create_user(db, user_data)
        
        # Get response from OpenAI service
        response_data = await openai_service.get_chat_response(
            user_message=request.message,
            user_identifier=user_identifier,
            db_session=db
        )
        
        if "error" in response_data:
            raise HTTPException(status_code=500, detail=response_data["error"])
        
        # Create session record
        session_data = {
            "user_id": user.id,
            "transcript": f"User: {request.message}\nAI: {response_data['response']}",
            "structured_data": response_data.get("structured_data"),
            "mode": "chat"
        }
        session = await create_session(db, session_data)
        
        # Update user profile with extracted data
        if response_data.get("structured_data"):
            await update_user_with_session_data(db, user_identifier, response_data["structured_data"])
        
        return ChatResponse(
            response=response_data["response"],
            user_id=str(user.id),
            session_id=str(session.session_id),
            structured_data=response_data.get("structured_data")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")