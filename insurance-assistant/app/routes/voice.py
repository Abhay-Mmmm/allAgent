from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.schemas.session import VoiceSessionRequest, VoiceSessionResponse
from app.services.nova_sonic_service import nova_sonic_service
from app.services.memory_service import (
    get_user_by_phone, get_user_by_id, create_user, update_user_with_session_data, create_session
)
from app.models.session import Session as SessionModel
from app.models.user import User
import uuid
import json
import logging

router = APIRouter()

@router.post("/voice-session", response_model=VoiceSessionResponse)
async def voice_session_endpoint(
    request: VoiceSessionRequest,
    db: Session = Depends(get_db)
):
    """
    Voice session endpoint that initializes a voice session
    Returns session ID and WebSocket URL for audio streaming
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
        
        # Create session record
        session_data = {
            "user_id": user.id,
            "transcript": "",
            "structured_data": {},
            "mode": "voice"
        }
        session = await create_session(db, session_data)
        
        # Generate WebSocket URL for audio streaming
        ws_url = f"/api/v1/voice-stream/{session.session_id}"
        
        return VoiceSessionResponse(
            session_id=str(session.session_id),
            user_id=str(user.id),
            status="initialized",
            ws_url=ws_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.websocket("/voice-stream/{session_id}")
async def websocket_voice_stream(websocket: WebSocket, session_id: str, db: Session = Depends(get_db)):
    """
    WebSocket endpoint for real-time voice streaming
    Handles bidirectional audio streaming between caller and AI
    """
    await websocket.accept()
    
    try:
        # Retrieve session and user info
        session = db.query(SessionModel).filter(
            SessionModel.session_id == session_id
        ).first()
        
        if not session:
            await websocket.close(code=1008, reason="Session not found")
            return
        
        user = db.query(User).filter(
            User.id == session.user_id
        ).first()
        
        if not user:
            await websocket.close(code=1008, reason="User not found")
            return
        
        # Prepare user identifier for context
        user_identifier = user.phone_number or user.user_id
        
        # Initialize voice stream processing
        # This would connect to Nova Sonic for real-time processing
        while True:
            # Receive audio data from client
            data = await websocket.receive_bytes()
            
            # Process with voice AI (Nova Sonic)
            # In a real implementation, this would be a continuous stream
            # For this example, we'll simulate the process
            response = await process_voice_input(data, user_identifier, db)
            
            # Send response back to client
            await websocket.send_bytes(response["response_audio"])
            
    except WebSocketDisconnect:
        logging.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logging.error(f"Error in voice stream {session_id}: {str(e)}")
        await websocket.close(code=1011, reason="Internal server error")

async def process_voice_input(audio_data: bytes, user_identifier: str, db: Session) -> dict:
    """
    Process voice input through Nova Sonic and return response
    """
    # This is a placeholder implementation
    # In a real implementation, this would connect to Nova Sonic
    # and process the audio in real-time
    
    # For now, we'll simulate the process
    return {
        "response_text": "Simulated response to voice input",
        "response_audio": b"simulated audio response",
        "user_input": "simulated transcription"
    }