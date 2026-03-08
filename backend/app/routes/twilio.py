"""
Twilio Voice Routes — AI Conversation Loop
==========================================
Handles the real-time Twilio voice call lifecycle using TwiML.

Flow:
  1. Twilio dials the lead and hits POST /twilio/voice
  2. Backend responds with TwiML <Gather> to capture speech
  3. Twilio sends the speech transcript to POST /twilio/process-speech
  4. Backend calls Groq, returns TwiML <Say> with the AI reply + new <Gather>
  5. Loop continues until the call ends
  6. POST /twilio/status receives final call status events

Endpoints:
  POST /twilio/voice          — Entry point; starts conversation
  POST /twilio/process-speech — Speech → Groq → TwiML response
  POST /twilio/status         — Call status updates (completed, failed, etc.)
"""

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Form, Query, Request, Response
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.database import get_db
from app.db.models import CallQueue, CallSession, Lead
from app.services.groq_service import SALES_AGENT_SYSTEM_PROMPT, get_groq_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/twilio", tags=["twilio-voice"])

# ── TwiML helpers ─────────────────────────────────────────────────────────────

TWIML_CONTENT_TYPE = "text/xml"

# How long (seconds) Twilio waits for speech before timing out
SPEECH_TIMEOUT = "auto"         # "auto" = Twilio detects end-of-speech
MAX_GATHER_TIMEOUT = 10         # fallback hard timeout in seconds

# The AI agent's opening greeting (used on the very first turn)
OPENING_GREETING = (
    "Hello! This is Priya calling from allAgent, your insurance advisor. "
    "I'm reaching out to discuss insurance solutions that may benefit you. "
    "Do you have a few minutes to chat?"
)


def _build_twiml_gather(say_text: str, action_url: str) -> str:
    """
    Return a TwiML document that:
      1. Says `say_text` to the caller.
      2. Opens a <Gather> to capture the caller's speech reply.
      3. Uses the given `action_url` as the callback for the captured speech.
    """
    escaped = say_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="{action_url}" method="POST"
          speechTimeout="{SPEECH_TIMEOUT}" timeout="{MAX_GATHER_TIMEOUT}"
          language="en-IN">
    <Say voice="Polly.Aditi" language="en-IN">{escaped}</Say>
  </Gather>
  <Say voice="Polly.Aditi" language="en-IN">
    I didn't catch that. Could you please repeat?
  </Say>
  <Redirect method="POST">{action_url}?timeout=1</Redirect>
</Response>"""


def _build_twiml_say_hangup(say_text: str) -> str:
    """Return TwiML that says something and then hangs up — used for fatal errors."""
    escaped = say_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">{escaped}</Say>
  <Hangup/>
</Response>"""


def _process_speech_url(request: Request) -> str:
    """
    Build an absolute URL to /twilio/process-speech that Twilio can reach.
    Prefers BASE_URL from settings; falls back to the Host header.
    """
    settings = get_settings()
    base = getattr(settings, "twilio_base_url", "").rstrip("/")
    if not base:
        # Derive from the incoming request (useful during local ngrok dev)
        scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
        host = request.headers.get("x-forwarded-host", request.headers.get("host", "localhost"))
        base = f"{scheme}://{host}"
    return f"{base}/twilio/process-speech"


# ── Conversation history store ────────────────────────────────────────────────
# In production you would use Redis or the DB.  For now, an in-process dict
# keyed by Twilio CallSid works fine for single-instance deployments.
_conversation_history: dict[str, list[dict]] = {}


def _get_history(call_sid: str) -> list[dict]:
    return _conversation_history.setdefault(call_sid, [])


def _append_history(call_sid: str, role: str, content: str) -> None:
    _get_history(call_sid).append({"role": role, "content": content})


def _trim_history(call_sid: str, max_turns: int = 10) -> None:
    """Keep the last N turns to avoid exceeding Groq token limits."""
    history = _conversation_history.get(call_sid, [])
    if len(history) > max_turns * 2:
        _conversation_history[call_sid] = history[-(max_turns * 2):]


def _clear_history(call_sid: str) -> None:
    _conversation_history.pop(call_sid, None)


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/voice")
async def twilio_voice(
    request: Request,
    # Twilio POSTs form data, not JSON
    CallSid: Optional[str] = Form(None),
    To: Optional[str] = Form(None),
    From: Optional[str] = Form(None),
    CallStatus: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Entry point for every outbound call.

    Twilio calls this webhook when the lead picks up the phone.
    Returns TwiML that greets the lead and opens a speech <Gather>.
    Also marks the queue item as 'calling'.
    """
    logger.info(f"[twilio/voice] CallSid={CallSid} To={To} From={From} Status={CallStatus}")

    # Mark the queue item as "calling" (best-effort — don't fail the TwiML if DB is slow)
    if To:
        try:
            await db.execute(
                update(CallQueue)
                .where(CallQueue.phone_number == To)
                .where(CallQueue.status == "pending")
                .values(status="calling", attempts=CallQueue.attempts + 1)
            )
            await db.commit()
        except Exception as exc:
            logger.warning(f"[twilio/voice] Could not update queue status: {exc}")

    # Seed the conversation with the system prompt
    if CallSid:
        history = _get_history(CallSid)
        if not history:
            # No system message in the history list — we pass it separately to Groq
            pass  # history starts empty; system prompt injected in process-speech

    action_url = _process_speech_url(request)
    twiml = _build_twiml_gather(OPENING_GREETING, action_url)

    return Response(content=twiml, media_type=TWIML_CONTENT_TYPE)


@router.post("/process-speech")
async def twilio_process_speech(
    request: Request,
    # Standard Twilio Gather parameters
    CallSid: Optional[str] = Form(None),
    SpeechResult: Optional[str] = Form(None),
    Confidence: Optional[str] = Form(None),
    To: Optional[str] = Form(None),
    From: Optional[str] = Form(None),
    # Custom flag: 1 if the previous <Gather> timed out
    timeout: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Receives the lead's speech, sends it to Groq, and returns the AI's reply as TwiML.

    Twilio POSTs here after every <Gather> collects speech.
    The conversation history for the CallSid is maintained in-process.
    """
    logger.info(
        f"[twilio/process-speech] CallSid={CallSid} "
        f"Speech='{(SpeechResult or '')[:80]}' Confidence={Confidence}"
    )

    action_url = _process_speech_url(request)

    # ── Handle speech timeout (no speech detected) ──────────────────────────
    if timeout:
        twiml = _build_twiml_gather(
            "I'm sorry, I didn't hear anything. Could you please say something?",
            action_url,
        )
        return Response(content=twiml, media_type=TWIML_CONTENT_TYPE)

    user_speech = (SpeechResult or "").strip()

    # ── Detect end-of-call intent ────────────────────────────────────────────
    farewell_phrases = (
        "bye", "goodbye", "hang up", "end call", "stop", "not interested",
        "no thanks", "don't call", "remove me", "do not call"
    )
    if any(phrase in user_speech.lower() for phrase in farewell_phrases):
        _clear_history(CallSid or "")
        twiml = _build_twiml_say_hangup(
            "Thank you for your time. Have a wonderful day! Goodbye."
        )
        return Response(content=twiml, media_type=TWIML_CONTENT_TYPE)

    # ── Build conversation history ───────────────────────────────────────────
    if CallSid:
        _append_history(CallSid, "user", user_speech)
        _trim_history(CallSid)
        history = _get_history(CallSid)
    else:
        history = [{"role": "user", "content": user_speech}]

    # ── Call Groq ────────────────────────────────────────────────────────────
    try:
        groq = get_groq_service()
        messages = [{"role": "system", "content": SALES_AGENT_SYSTEM_PROMPT}] + history

        response = await groq.client.chat.completions.create(
            model=groq.fast_model,   # Use fast model for real-time voice
            messages=messages,
            temperature=0.65,
            max_tokens=256,          # Keep responses short for voice
        )
        ai_reply = (response.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.error(f"[twilio/process-speech] Groq error: {exc}", exc_info=True)
        ai_reply = (
            "I'm having a brief technical issue. Could you give me just a moment? "
            "Please try again."
        )

    # Append AI reply to history
    if CallSid:
        _append_history(CallSid, "assistant", ai_reply)

    # ── Return TwiML ─────────────────────────────────────────────────────────
    twiml = _build_twiml_gather(ai_reply, action_url)
    return Response(content=twiml, media_type=TWIML_CONTENT_TYPE)


@router.post("/status")
async def twilio_status(
    request: Request,
    CallSid: Optional[str] = Form(None),
    CallStatus: Optional[str] = Form(None),
    To: Optional[str] = Form(None),
    From: Optional[str] = Form(None),
    CallDuration: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Receives Twilio call status callbacks.

    Twilio sends this for every status transition:
      initiated → ringing → in-progress → completed | busy | no-answer | failed | canceled

    On terminal statuses we:
      - Update the CallQueue row
      - Persist a minimal CallSession and clean up history
      - Clean up in-memory conversation history
    """
    logger.info(
        f"[twilio/status] CallSid={CallSid} Status={CallStatus} "
        f"To={To} Duration={CallDuration}s"
    )

    terminal_statuses = {"completed", "busy", "no-answer", "failed", "canceled"}

    if CallStatus not in terminal_statuses:
        # Non-terminal — nothing to do
        return Response(content="", status_code=204)

    # ── Clean up in-memory history ───────────────────────────────────────────
    history = _conversation_history.pop(CallSid or "", [])

    # ── Map Twilio status → queue status ────────────────────────────────────
    _status_map = {
        "completed": "completed",
        "no-answer": "no_answer",
        "busy":      "no_answer",
        "canceled":  "failed",
        "failed":    "failed",
    }
    queue_status = _status_map.get(CallStatus, "failed")

    phone = To
    duration = int(CallDuration or 0)

    if not phone:
        logger.warning("[twilio/status] No 'To' phone in status callback — cannot update DB")
        return Response(content="", status_code=204)

    try:
        # Update the queue item
        await db.execute(
            update(CallQueue)
            .where(CallQueue.phone_number == phone)
            .where(CallQueue.status == "calling")
            .values(status=queue_status)
        )

        # Persist a CallSession for completed calls and for no-answers/busy
        save_session = CallStatus == "completed" or CallStatus in ("no-answer", "busy")
        if save_session:
            # Reconstruct a plain-text transcript from history (empty for no-answer/busy)
            transcript_lines = [
                f"{msg['role'].capitalize()}: {msg['content']}"
                for msg in history
                if msg.get("role") in ("user", "assistant")
            ]
            transcript_text = "\n".join(transcript_lines)

            # Find or create the lead
            result = await db.execute(select(Lead).where(Lead.phone_number == phone))
            lead = result.scalars().first()
            if not lead:
                lead = Lead(
                    id=uuid.uuid4(),
                    phone_number=phone,
                    lead_status="contacted",
                )
                db.add(lead)
                await db.flush()

            # Save the session — use CallSid as the de-dup key
            existing = await db.execute(
                select(CallSession).where(CallSession.call_sid == CallSid)
            )
            if not existing.scalars().first():
                session = CallSession(
                    id=uuid.uuid4(),
                    call_sid=CallSid,
                    lead_id=lead.id,
                    transcript=transcript_text or ("[No answer]" if CallStatus == "no-answer" else "[Busy]" if CallStatus == "busy" else "[No speech captured]"),
                    structured_data={},
                    call_duration=duration,
                    call_status=queue_status,  # "completed" | "no_answer"
                )
                db.add(session)
                logger.info(
                    f"[twilio/status] Saved CallSession for CallSid={CallSid} "
                    f"lead={phone} status={CallStatus} duration={duration}s"
                )

        await db.commit()

    except Exception as exc:
        logger.error(f"[twilio/status] DB update failed: {exc}", exc_info=True)
        await db.rollback()

    return Response(content="", status_code=204)
