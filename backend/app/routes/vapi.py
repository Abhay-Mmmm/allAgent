"""
VAPI Voice Routes
Handles incoming Twilio calls, VAPI webhooks, and caller profile lookups.

Endpoints:
  POST /incoming-call     — Accept Twilio webhook, create VAPI session
  POST /vapi-webhook      — Receive VAPI server events (transcript, end-of-call, etc.)
  GET  /caller-profile/{phone_number} — Return stored user profile
"""

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.memory_service import MemoryService
from app.services.vapi_service import VAPIService, VAPIDataExtractor
from app.schemas.schemas import CallerProfileResponse

logger = logging.getLogger(__name__)
router = APIRouter()


# ──────────────────────────────────────────────
#  POST /incoming-call
# ──────────────────────────────────────────────

@router.post("/incoming-call")
async def incoming_call_endpoint(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Receives the Twilio webhook for an incoming call.
    Looks up the caller profile by phone number, injects context
    into a transient VAPI assistant, and forwards the call to VAPI.
    """
    try:
        # Parse Twilio form-encoded body or JSON body
        content_type = request.headers.get("content-type", "")
        if "application/x-www-form-urlencoded" in content_type:
            form = await request.form()
            caller_phone = form.get("From", form.get("Caller", ""))
            called_number = form.get("To", form.get("Called", ""))
        else:
            body = await request.json()
            caller_phone = body.get("from", body.get("phone_number", ""))
            called_number = body.get("to", "")

        if not caller_phone:
            raise HTTPException(status_code=400, detail="No caller phone number provided")

        logger.info(f"[incoming-call] Incoming call from {caller_phone} to {called_number}")

        # 1. Retrieve or create the caller's profile
        memory = MemoryService(db)
        user = await memory.get_or_create_user(
            identifier=caller_phone,
            phone=caller_phone,
        )
        context = await memory.get_user_context(user.id)

        # 2. Create VAPI call with personalized assistant
        vapi = VAPIService()
        call_result = await vapi.create_call_for_incoming(caller_phone, context)

        # 3. Save the session start
        session_id = call_result.get("id", str(uuid.uuid4()))
        await memory.save_session(
            user_id=user.id,
            session_id=session_id,
            transcript="[VAPI Voice Session Started]",
            data={"vapi_call_id": session_id},
            mode="voice",
        )

        logger.info(f"[incoming-call] VAPI call created: {session_id}")

        return {
            "status": "ok",
            "message": "Call forwarded to VAPI assistant",
            "vapi_call_id": session_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[incoming-call] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────
#  POST /vapi-webhook
# ──────────────────────────────────────────────

@router.post("/vapi-webhook")
async def vapi_webhook_endpoint(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Receives events from VAPI's Server URL.

    Key events handled:
      - end-of-call-report  → extract data, update DB
      - assistant-request    → return dynamic assistant config
      - status-update        → log call status
      - transcript           → (informational, logged)
    """
    try:
        # 1. Read raw body for signature validation
        raw_body = await request.body()
        payload = await request.json()

        # 2. Validate webhook signature
        vapi = VAPIService()
        signature = request.headers.get("x-vapi-signature")
        if not vapi.validate_webhook_signature(raw_body, signature):
            logger.warning("[vapi-webhook] Invalid webhook signature")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

        event_type = vapi.get_event_type(payload)
        logger.info(f"[vapi-webhook] Received event: {event_type}")

        # ── ASSISTANT-REQUEST ──
        # VAPI asks our server for the assistant config dynamically
        if event_type == "assistant-request":
            phone = vapi.extract_phone_from_webhook(payload)
            if phone:
                memory = MemoryService(db)
                user = await memory.get_or_create_user(identifier=phone, phone=phone)
                context = await memory.get_user_context(user.id)
                assistant_config = vapi.build_assistant_config(context)
                return {"assistant": assistant_config}
            else:
                # Fallback: return assistant with no personalization
                return {"assistant": vapi.build_assistant_config({})}

        # ── END-OF-CALL-REPORT ──
        # This is the most important event — contains the full transcript
        if event_type == "end-of-call-report":
            phone = vapi.extract_phone_from_webhook(payload)
            transcript = vapi.extract_transcript(payload)
            call_id = vapi.extract_call_id(payload) or str(uuid.uuid4())

            if not phone:
                logger.warning("[vapi-webhook] end-of-call-report without phone number")
                return {"status": "ok", "note": "no phone number found"}

            memory = MemoryService(db)
            user = await memory.get_or_create_user(identifier=phone, phone=phone)

            # Extract structured data from transcript using LLM
            structured_data = {}
            summary = ""
            if transcript:
                try:
                    extractor = VAPIDataExtractor()
                    extracted = await extractor.extract_from_transcript(transcript)
                    # Filter out None values before updating profile
                    structured_data = {
                        k: v for k, v in extracted.items()
                        if v is not None and k != "summary"
                    }
                    summary = extracted.get("summary", "")
                except Exception as e:
                    logger.error(f"[vapi-webhook] Extraction error: {e}", exc_info=True)

            # Update user profile with extracted data
            if structured_data:
                await memory.update_user_profile(user.id, structured_data)

            # Update the last conversation summary
            if summary:
                await memory.update_last_summary(user.id, summary)

            # Save the complete session
            await memory.save_session(
                user_id=user.id,
                session_id=call_id,
                transcript=transcript or "[No transcript available]",
                data=structured_data,
                mode="voice",
            )

            logger.info(
                f"[vapi-webhook] end-of-call-report processed for {phone} — "
                f"session {call_id}, extracted fields: {list(structured_data.keys())}"
            )

            return {"status": "ok", "processed": True}

        # ── STATUS-UPDATE ──
        if event_type == "status-update":
            message = payload.get("message", {})
            status = message.get("status", "unknown")
            call_id = vapi.extract_call_id(payload)
            logger.info(f"[vapi-webhook] Call {call_id} status: {status}")
            return {"status": "ok"}

        # ── TRANSCRIPT (partial/final) ──
        if event_type == "transcript":
            message = payload.get("message", {})
            transcript_type = message.get("transcriptType", "partial")
            role = message.get("role", "unknown")
            text = message.get("transcript", "")
            logger.debug(f"[vapi-webhook] transcript [{transcript_type}] {role}: {text[:100]}")
            return {"status": "ok"}

        # ── ALL OTHER EVENTS ──
        logger.info(f"[vapi-webhook] Unhandled event type: {event_type}")
        return {"status": "ok"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[vapi-webhook] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────
#  GET /caller-profile/{phone_number}
# ──────────────────────────────────────────────

@router.get("/caller-profile/{phone_number}", response_model=CallerProfileResponse)
async def get_caller_profile(phone_number: str, db: AsyncSession = Depends(get_db)):
    """
    Returns the stored profile for a caller identified by phone number.
    Used by external integrations or dashboards.
    """
    try:
        memory = MemoryService(db)
        user = await memory.get_or_create_user(identifier=phone_number, phone=phone_number)
        context = await memory.get_user_context(user.id)

        return CallerProfileResponse(
            phone_number=phone_number,
            name=context.get("name"),
            age=context.get("age"),
            occupation=context.get("occupation"),
            location=context.get("location"),
            insurance_interest=context.get("interest"),
            last_summary=context.get("last_summary"),
        )

    except Exception as e:
        logger.error(f"[caller-profile] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
