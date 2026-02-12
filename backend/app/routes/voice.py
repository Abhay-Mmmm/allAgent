from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services.memory_service import MemoryService
from app.services.nova_sonic_service import NovaSonicService
from app.schemas.schemas import VoiceSessionStartRequest, VoiceSessionResponse, VoiceChatRequest, VoiceChatResponse
import uuid

router = APIRouter()

@router.post("/voice-session", response_model=VoiceSessionResponse) # "POST /voice-session" requested
async def voice_session_endpoint(request: VoiceSessionStartRequest, db: AsyncSession = Depends(get_db)):
    try:
        memory_service = MemoryService(db)
        nova_service = NovaSonicService()
        
        # 1. Retrieve or create user
        user = await memory_service.get_or_create_user(request.user_identifier, request.phone_number)
        
        # 2. Get user context
        context = await memory_service.get_user_context(user.id)
        
        # 3. Start voice session
        session_data = await nova_service.start_voice_session(context)
        
        # 4. Save session start logic
        # We need a unique session ID for DB persistence
        session_id = session_data.get("session_id", str(uuid.uuid4()))
        
        await memory_service.save_session(
            user_id=user.id,
            session_id=session_id,
            transcript="[Voice Session Started]",
            data={},
            mode="voice"
        )
        
        # Update user identifier if newly generated? 
        # Typically session start does not update profile immediately but uses context.

        return VoiceSessionResponse(
            session_id=session_id,
            # Handle potential missing URL key if Nova service varies
            url=session_data.get("url", ""),
            status=session_data.get("status", "unknown")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voice-chat", response_model=VoiceChatResponse)
async def voice_chat_endpoint(request: VoiceChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Endpoint for emulated voice calls.
    Inputs: User transcript (from browser STT).
    Outputs: AI Text (to be spoken by browser TTS).
    Uses OpenAIService (Groq) for intelligence as AWS keys are invalid.
    """
    try:
        from app.services.openai_service import OpenAIService
        memory_service = MemoryService(db)
        # Using Groq service (aliased as OpenAIService for compatibility)
        ai_service = OpenAIService()
        
        # 1. Retrieve or create user
        user = await memory_service.get_or_create_user(request.user_identifier, request.phone_number)
        
        # 2. Get user context
        context = await memory_service.get_user_context(user.id)
        
        # 3. Call AI (Groq)
        # Note: OpenAIService.chat returns a dict with "response" and "structured_data"
        ai_response = await ai_service.chat(request.transcript, context)
        ai_text = ai_response.get("response", "I'm listening.")
        
        # 4. Save interaction (as voice mode)
        await memory_service.save_session(
            user_id=user.id,
            session_id=str(uuid.uuid4()),
            transcript=f"User: {request.transcript}\nAI: {ai_text}",
            data=ai_response.get("structured_data", {}),
            mode="voice-emulated"
        )
        
        return VoiceChatResponse(text_response=ai_text)
        
    except Exception as e:
        print(f"Error in voice-chat: {e}")
        return VoiceChatResponse(text_response="I am having trouble connecting to the brain right now.")
