"""
Call Queue Manager
==================
Manages the outbound call queue and orchestrates Twilio calls.

Responsibilities:
  - Add phone numbers to the queue (single or batch)
  - Process the queue sequentially (one active call at a time)
  - Trigger Twilio outbound calls via REST API
  - Update queue item status after each call
  - Retry logic for failed calls (max 3 attempts)

Queue states:
  pending   → ready to be called
  calling   → Twilio call in-flight
  completed → call ended successfully and status callback received
  failed    → max attempts reached or permanent error
"""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import SessionLocal
from app.db.models import CallQueue, Lead
from app.config import get_settings

logger = logging.getLogger(__name__)

TWILIO_API_BASE = "https://api.twilio.com/2010-04-01"
MAX_RETRY_ATTEMPTS = 3
CALL_INTERVAL_SECONDS = 3   # Pause between consecutive calls
CALL_TIMEOUT_SECONDS = 120  # Max wait for a single call to finish
STUCK_CALL_MINUTES = 2      # Mark calls in "calling" longer than this as failed

# ── Event system for call-completion signalling ──────────────────────────────
# The campaign runner waits on these asyncio Events; the Twilio webhook sets them.
_call_completion_events: dict[str, asyncio.Event] = {}
_campaign_active = False


def notify_call_completed(phone_number: str):
    """Signal that a call reached a terminal status.  Called by the Twilio webhook."""
    event = _call_completion_events.get(phone_number)
    if event:
        event.set()


class QueueManager:
    """
    Outbound call queue manager.

    Example usage:
        manager = QueueManager()
        await manager.add_numbers(["+91XXXXXXXXXX", "+91YYYYYYYYYY"])
        await manager.start_campaign()
    """

    def __init__(self):
        settings = get_settings()
        self.twilio_account_sid  = settings.twilio_account_sid
        self.twilio_auth_token   = settings.twilio_auth_token
        self.twilio_phone_number = settings.twilio_phone_number
        self.twilio_base_url     = settings.twilio_base_url.rstrip("/")
        self.groq_api_key        = settings.groq_api_key

        if not self.twilio_account_sid or not self.twilio_auth_token:
            raise ValueError(
                "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set — "
                "cannot make outbound calls"
            )
        if not self.twilio_phone_number:
            raise ValueError("TWILIO_PHONE_NUMBER is not set — cannot make outbound calls")

    # ──────────────────────────────────────────────
    #  QUEUE MANAGEMENT
    # ──────────────────────────────────────────────

    @staticmethod
    async def add_to_queue(
        db: AsyncSession,
        entries,
    ) -> List[CallQueue]:
        """
        Insert entries into the call queue (status=pending) and ensure
        a Lead record exists for each phone number.

        ``entries`` is a list of objects with ``.phone_number`` and optional ``.name``.
        Skips numbers already in queue with status pending or calling.
        Returns list of newly created queue items.
        """
        created = []
        for entry in entries:
            phone = entry.phone_number.strip() if isinstance(entry.phone_number, str) else str(entry.phone_number).strip()
            name = getattr(entry, "name", None)
            if not phone:
                continue

            # Check for existing pending/calling entry
            existing = await db.execute(
                select(CallQueue).where(
                    CallQueue.phone_number == phone,
                    CallQueue.status.in_(["pending", "calling"]),
                )
            )
            if existing.scalars().first():
                logger.info(f"[Queue] Skipping {phone} — already in queue")
                continue

            # Ensure a Lead record exists
            lead_result = await db.execute(
                select(Lead).where(Lead.phone_number == phone)
            )
            lead = lead_result.scalars().first()
            if not lead:
                lead = Lead(
                    id=uuid.uuid4(),
                    phone_number=phone,
                    name=name,
                    lead_status="new",
                )
                db.add(lead)
            elif name and not lead.name:
                lead.name = name

            item = CallQueue(
                id=uuid.uuid4(),
                phone_number=phone,
                status="pending",
                attempts=0,
            )
            db.add(item)
            created.append(item)

        if created:
            await db.commit()
            logger.info(f"[Queue] Added {len(created)} numbers to queue")

        return created

    @staticmethod
    async def get_queue_stats(db: AsyncSession) -> dict:
        """Return counts per status for the dashboard."""
        from sqlalchemy import func as sa_func
        result = await db.execute(
            select(CallQueue.status, sa_func.count(CallQueue.id)).group_by(CallQueue.status)
        )
        stats = {row[0]: row[1] for row in result.fetchall()}
        return {
            "pending":   stats.get("pending", 0),
            "calling":   stats.get("calling", 0),
            "completed": stats.get("completed", 0),
            "no_answer": stats.get("no_answer", 0),
            "failed":    stats.get("failed", 0),
            "total":     sum(stats.values()),
        }

    @staticmethod
    async def get_queue_items(
        db: AsyncSession,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[CallQueue]:
        """Paginated queue item retrieval, optionally filtered by status."""
        query = select(CallQueue).order_by(CallQueue.created_at.asc()).limit(limit).offset(offset)
        if status:
            query = query.where(CallQueue.status == status)
        result = await db.execute(query)
        return result.scalars().all()

    # ──────────────────────────────────────────────
    #  CAMPAIGN RUNNER
    # ──────────────────────────────────────────────

    async def start_campaign(self) -> dict:
        """
        Start processing the pending queue.
        Runs in background — processes all pending items sequentially.
        Returns immediately with a campaign ID.
        """
        campaign_id = str(uuid.uuid4())
        logger.info(f"[Campaign {campaign_id}] Starting outbound calling campaign")
        asyncio.create_task(self._process_queue(campaign_id))
        return {"campaign_id": campaign_id, "status": "started"}

    async def _process_queue(self, campaign_id: str):
        """Background task: process pending queue items one-by-one, waiting for each to complete."""
        global _campaign_active
        _campaign_active = True
        logger.info(f"[Campaign {campaign_id}] Queue processor started")
        processed = 0
        failed = 0

        try:
            # Recover calls stuck from a previous run
            await self._recover_stuck_calls()

            while True:
                # Fetch ONE pending item fresh from DB each iteration
                async with SessionLocal() as db:
                    result = await db.execute(
                        select(CallQueue)
                        .where(CallQueue.status == "pending")
                        .where(CallQueue.attempts < MAX_RETRY_ATTEMPTS)
                        .order_by(CallQueue.created_at.asc())
                        .limit(1)
                    )
                    item = result.scalars().first()
                    if not item:
                        logger.info(f"[Campaign {campaign_id}] No more pending items")
                        break
                    # Snapshot values — object is detached once session closes
                    item_id = item.id
                    item_phone = item.phone_number

                logger.info(f"[Campaign {campaign_id}] Processing {item_phone}")

                # Register a completion event so the webhook can wake us up
                event = asyncio.Event()
                _call_completion_events[item_phone] = event

                try:
                    success = await self._initiate_call(item_id, item_phone)
                    if not success:
                        failed += 1
                        await asyncio.sleep(CALL_INTERVAL_SECONDS)
                        continue

                    # ── Wait for the Twilio status webhook to fire ───────────
                    try:
                        await asyncio.wait_for(event.wait(), timeout=CALL_TIMEOUT_SECONDS)
                    except asyncio.TimeoutError:
                        logger.warning(
                            f"[Campaign {campaign_id}] Timeout for {item_phone} "
                            f"after {CALL_TIMEOUT_SECONDS}s — marking failed"
                        )
                        async with SessionLocal() as db:
                            await db.execute(
                                update(CallQueue)
                                .where(CallQueue.id == item_id)
                                .where(CallQueue.status == "calling")
                                .values(status="failed")
                            )
                            await db.commit()
                        failed += 1
                        await asyncio.sleep(CALL_INTERVAL_SECONDS)
                        continue

                    # Read final status written by the webhook
                    async with SessionLocal() as db:
                        result = await db.execute(
                            select(CallQueue.status).where(CallQueue.id == item_id)
                        )
                        final_status = result.scalar()

                    if final_status == "completed":
                        processed += 1
                    else:
                        failed += 1

                    await asyncio.sleep(CALL_INTERVAL_SECONDS)

                except Exception as e:
                    logger.error(
                        f"[Campaign {campaign_id}] Error processing {item_phone}: {e}",
                        exc_info=True,
                    )
                    failed += 1
                finally:
                    _call_completion_events.pop(item_phone, None)

        except Exception as e:
            logger.error(f"[Campaign {campaign_id}] Fatal error: {e}", exc_info=True)
        finally:
            _campaign_active = False

        logger.info(
            f"[Campaign {campaign_id}] Finished — processed={processed} failed={failed}"
        )

    async def _initiate_call(self, item_id, phone_number: str) -> bool:
        """
        Atomically claim a queue item and trigger a Twilio outbound call.
        Returns True if the call was successfully initiated.
        """
        async with SessionLocal() as db:
            # Atomically claim: only succeeds if still pending
            result = await db.execute(
                update(CallQueue)
                .where(CallQueue.id == item_id)
                .where(CallQueue.status == "pending")
                .values(status="calling", attempts=CallQueue.attempts + 1)
            )
            await db.commit()

            if result.rowcount == 0:
                logger.warning(f"[Queue] Could not claim {phone_number} — not pending")
                return False

            await self._get_or_create_lead(db, phone_number)

        try:
            call_sid = await self._trigger_twilio_call(phone_number)
            logger.info(f"[Queue] Initiated Twilio call {call_sid} for {phone_number}")
            return True
        except Exception as e:
            logger.error(f"[Queue] Twilio call failed for {phone_number}: {e}")
            async with SessionLocal() as db:
                res = await db.execute(
                    select(CallQueue.attempts).where(CallQueue.id == item_id)
                )
                attempts = res.scalar() or 0
                new_status = "failed" if attempts >= MAX_RETRY_ATTEMPTS else "pending"
                await db.execute(
                    update(CallQueue)
                    .where(CallQueue.id == item_id)
                    .values(status=new_status)
                )
                await db.commit()
            return False

    async def _trigger_twilio_call(self, phone_number: str) -> str:
        """
        POST to Twilio REST API to initiate an outbound call.
        Twilio will hit our /api/twilio/voice webhook when the lead picks up.
        Returns the Twilio CallSid.
        """
        voice_url    = f"{self.twilio_base_url}/api/twilio/voice"
        status_url   = f"{self.twilio_base_url}/api/twilio/status"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{TWILIO_API_BASE}/Accounts/{self.twilio_account_sid}/Calls.json",
                auth=(self.twilio_account_sid, self.twilio_auth_token),
                data={
                    "From":           self.twilio_phone_number,
                    "To":             phone_number,
                    "Url":            voice_url,
                    "StatusCallback": status_url,
                    "StatusCallbackMethod": "POST",
                    "StatusCallbackEvent":  "completed ringing answered",
                    "Timeout":        30,   # seconds to ring before no-answer
                    "MachineDetection": "Enable",   # skip voicemail greeting
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("sid", "unknown")

    @staticmethod
    async def _get_or_create_lead(db: AsyncSession, phone_number: str) -> Lead:
        """Return existing lead or create a minimal one for this phone number."""
        result = await db.execute(
            select(Lead).where(Lead.phone_number == phone_number)
        )
        lead = result.scalars().first()
        if not lead:
            lead = Lead(id=uuid.uuid4(), phone_number=phone_number, lead_status="new")
            db.add(lead)
            await db.commit()
            await db.refresh(lead)
            logger.info(f"[Queue] Created new lead for {phone_number}")
        return lead

    @staticmethod
    async def _recover_stuck_calls():
        """Mark calls stuck in 'calling' for longer than STUCK_CALL_MINUTES as failed."""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=STUCK_CALL_MINUTES)
        async with SessionLocal() as db:
            result = await db.execute(
                update(CallQueue)
                .where(CallQueue.status == "calling")
                .where(CallQueue.updated_at < cutoff)
                .values(status="failed")
            )
            await db.commit()
            if result.rowcount > 0:
                logger.warning(f"[Queue] Recovered {result.rowcount} stuck calls → failed")

    @staticmethod
    async def process_next_item():
        """
        Process the next pending queue item (single shot).
        Called from the Twilio webhook when no campaign is actively running.
        """
        if _campaign_active:
            return  # Campaign runner handles advancement

        try:
            manager = QueueManager()
        except ValueError:
            return  # Twilio not configured

        async with SessionLocal() as db:
            result = await db.execute(
                select(CallQueue)
                .where(CallQueue.status == "pending")
                .where(CallQueue.attempts < MAX_RETRY_ATTEMPTS)
                .order_by(CallQueue.created_at.asc())
                .limit(1)
            )
            item = result.scalars().first()
            if not item:
                return
            item_id = item.id
            item_phone = item.phone_number

        await manager._initiate_call(item_id, item_phone)

    @staticmethod
    def _build_lead_context(lead: Lead) -> dict:
        return {
            "name":               lead.name,
            "age":                lead.age,
            "occupation":         lead.occupation,
            "location":           lead.location,
            "insurance_interest": lead.insurance_interest,
            "last_summary":       lead.last_summary,
        }
