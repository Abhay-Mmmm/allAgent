from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services.memory_service import MemoryService
from app.services.openai_service import OpenAIService
from app.schemas.schemas import ChatRequest, ChatResponse
import uuid

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    try:
        print(f"DEBUG: Processing chat request for user: {request.user_identifier}")
        memory_service = MemoryService(db)
        # Using dependency injection or singleton for service instantiation is better, 
        # but instantiating here is okay for simple setup.
        openai_service = OpenAIService()

        # 1. Retrieve or create user
        print("DEBUG: Getting/Creating user...")
        user = await memory_service.get_or_create_user(request.user_identifier, request.phone_number)
        
        # 2. Get user context
        context = await memory_service.get_user_context(user.id)
        
        # 3. Call OpenAI
        print("DEBUG: Calling OpenAI Service...")
        ai_response = await openai_service.chat(request.message, context)
        print(f"DEBUG: OpenAI Response: {ai_response}")
        
        # 4. Extract text and structured data
        response_text = ai_response.get("response", "I'm sorry, I missed that.")
        structured_data = ai_response.get("structured_data", {})
        
        # 5. Update user profile if structured data found
        if structured_data:
            print(f"DEBUG: Updating user profile with data: {structured_data}")
            await memory_service.update_user_profile(user.id, structured_data)
        
        # 6. Save session
        # Generate session_id if not existing, or reuse based on client session logic. 
        # For simplicity, treating each chat message as part of a session, or just logging interaction.
        # The prompt implies a session concept. We'll generate a unique ID for this turn or pass it.
        interaction_id = str(uuid.uuid4())
        
        await memory_service.save_session(
            user_id=user.id,
            session_id=interaction_id,
            transcript=f"User: {request.message}\nAI: {response_text}",
            data=structured_data,
            mode="chat"
        )

        return ChatResponse(
            response=response_text,
            structured_data=structured_data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
