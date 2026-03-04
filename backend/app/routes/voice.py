"""
Legacy Voice Routes (Emulated Voice Chat)
Provides the browser-based voice chat endpoint that uses STT/TTS in the browser
and sends text to the Groq LLM. This is kept for backward compatibility with
the frontend's emulated voice feature.

The primary voice flow now goes through VAPI (see routes/vapi.py).
"""

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.memory_service import MemoryService
from app.services.openai_service import OpenAIService
from app.schemas.schemas import VoiceChatRequest, VoiceChatResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/voice-chat", response_model=VoiceChatResponse)
async def voice_chat_endpoint(request: VoiceChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Endpoint for browser-emulated voice calls.
    Inputs: User transcript (from browser STT).
    Outputs: AI Text (to be spoken by browser TTS).
    Uses OpenAIService (Groq) for intelligence.
    """
    try:
        memory_service = MemoryService(db)
        ai_service = OpenAIService()

        # 1. Retrieve or create user
        user = await memory_service.get_or_create_user(request.user_identifier, request.phone_number)

        # 2. Get user context
        context = await memory_service.get_user_context(user.id)

        # 3. Call AI (Groq)
        ai_response = await ai_service.chat(request.transcript, context)
        ai_text = ai_response.get("response", "I'm listening.")

        # 4. Update profile if structured data found
        structured_data = ai_response.get("structured_data", {})
        if structured_data:
            await memory_service.update_user_profile(user.id, structured_data)

        # 5. Save interaction
        await memory_service.save_session(
            user_id=user.id,
            session_id=str(uuid.uuid4()),
            transcript=f"User: {request.transcript}\nAI: {ai_text}",
            data=structured_data,
            mode="voice-emulated",
        )

        return VoiceChatResponse(text_response=ai_text)

    except Exception as e:
        logger.error(f"Error in voice-chat: {e}", exc_info=True)
        return VoiceChatResponse(text_response="I am having trouble connecting right now. Please try again.")
