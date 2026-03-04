"""
VAPI Webhook Route
==================
Receives all VAPI server events and processes them.

POST /vapi-webhook

Handled events:
  - end-of-call-report  → extract data, update lead, save session, update queue
  - status-update       → update queue item status
  - assistant-request   → return personalized assistant config (not used in outbound mode, kept for safety)
  - transcript          → logged only
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import CallQueue, CallSession, Lead
from app.services.vapi_service import VAPIService
from app.services.groq_service import get_groq_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["vapi-webhook"])


@router.post("/vapi-webhook")
async def vapi_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Main VAPI Server URL handler.
    Validates signature, routes by event type, and persists results.
    """
    # 1. Read raw bytes for HMAC validation
    raw_body = await request.body()

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # 2. Signature validation
    vapi = VAPIService()
    signature = request.headers.get("x-vapi-signature")
    if not vapi.validate_webhook_signature(raw_body, signature):
        logger.warning("[webhook] Invalid VAPI webhook signature — rejecting")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event_type = vapi.get_event_type(payload)
    logger.info(f"[webhook] Received event: {event_type}")

    # ── END-OF-CALL-REPORT ─────────────────────────────────────────────────
    if event_type == "end-of-call-report":
        return await _handle_end_of_call(vapi, payload, db)

    # ── STATUS-UPDATE ──────────────────────────────────────────────────────
    if event_type == "status-update":
        return await _handle_status_update(vapi, payload, db)

    # ── TRANSCRIPT (real-time partial) ─────────────────────────────────────
    if event_type == "transcript":
        message = payload.get("message", {})
        role = message.get("role", "unknown")
        text = message.get("transcript", "")[:100]
        logger.debug(f"[webhook] transcript [{role}]: {text}")
        return {"status": "ok"}

    # ── ASSISTANT-REQUEST (inbound / fallback) ─────────────────────────────
    if event_type == "assistant-request":
        logger.info("[webhook] assistant-request received — this is an inbound call (unexpected in outbound mode)")
        return {"status": "ok", "message": "outbound-only mode — assistant pre-configured"}

    # ── ALL OTHER EVENTS ───────────────────────────────────────────────────
    logger.info(f"[webhook] Unhandled event type: {event_type}")
    return {"status": "ok"}


async def _handle_end_of_call(
    vapi: VAPIService,
    payload: dict,
    db: AsyncSession,
):
    """
    Process an end-of-call-report:
      1. Extract phone, transcript, call_id, duration
      2. Find or create the lead
      3. Use Groq to extract structured data from transcript
      4. Update lead profile + save CallSession
      5. Mark the CallQueue item as completed
    """
    phone       = vapi.extract_phone_from_webhook(payload)
    transcript  = vapi.extract_transcript(payload)
    call_id     = vapi.extract_call_id(payload)
    duration    = vapi.extract_call_duration(payload)

    if not phone:
        logger.warning("[webhook] end-of-call-report without phone number — skipping")
        return {"status": "ok", "note": "no phone number"}

    # 1. Get or create lead
    result = await db.execute(select(Lead).where(Lead.phone_number == phone))
    lead = result.scalars().first()
    if not lead:
        lead = Lead(id=uuid.uuid4(), phone_number=phone, lead_status="contacted")
        db.add(lead)
        await db.flush()

    # 2. Extract structured data from transcript
    structured_data = {}
    summary = ""

    if transcript:
        try:
            groq = get_groq_service()
            extracted = await groq.extract_lead_data(transcript)

            # Split summary and status out from profile fields
            summary = extracted.pop("summary", "") or ""
            new_status = extracted.pop("lead_status", None)

            # Only update non-null fields
            structured_data = {k: v for k, v in extracted.items() if v is not None}

            # Update lead profile with extracted fields
            if structured_data:
                for field, value in structured_data.items():
                    if hasattr(lead, field) and value is not None:
                        setattr(lead, field, value)

            if summary:
                lead.last_summary = summary

            if new_status:
                lead.lead_status = new_status

        except Exception as e:
            logger.error(f"[webhook] Groq extraction failed: {e}", exc_info=True)

    # 3. Save CallSession (de-duplicate by vapi_call_id)
    if call_id:
        existing_session = await db.execute(
            select(CallSession).where(CallSession.vapi_call_id == call_id)
        )
        if existing_session.scalars().first():
            logger.debug(f"[webhook] Session {call_id} already saved — skipping")
            await db.commit()
            return {"status": "ok", "note": "duplicate webhook"}

    session = CallSession(
        id=uuid.uuid4(),
        vapi_call_id=call_id,
        lead_id=lead.id,
        transcript=transcript or "[No transcript available]",
        structured_data=structured_data,
        call_duration=duration,
    )
    db.add(session)

    # 4. Mark queue item as completed
    await db.execute(
        update(CallQueue)
        .where(CallQueue.phone_number == phone)
        .where(CallQueue.status == "calling")
        .values(status="completed")
    )

    await db.commit()
    logger.info(
        f"[webhook] end-of-call processed — phone={phone} call_id={call_id} "
        f"duration={duration}s lead_status={lead.lead_status}"
    )
    return {"status": "ok", "processed": True}


async def _handle_status_update(
    vapi: VAPIService,
    payload: dict,
    db: AsyncSession,
):
    """Handle status-update events — update queue item status on known transitions."""
    phone  = vapi.extract_phone_from_webhook(payload)
    status = vapi.extract_call_status(payload)
    call_id = vapi.extract_call_id(payload)

    logger.info(f"[webhook] status-update: phone={phone} call_id={call_id} status={status}")

    # If VAPI reports the call ended without completing, mark queue as failed
    if status in ("no-answer", "busy", "failed", "canceled") and phone:
        await db.execute(
            update(CallQueue)
            .where(CallQueue.phone_number == phone)
            .where(CallQueue.status == "calling")
            .values(status="failed")
        )
        await db.commit()
        logger.info(f"[webhook] Queue item marked failed for {phone} (status={status})")

    return {"status": "ok"}
