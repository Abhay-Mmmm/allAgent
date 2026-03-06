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
CALL_INTERVAL_SECONDS = 5  # Wait between consecutive calls to avoid rate limits


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
        phone_numbers: List[str],
    ) -> List[CallQueue]:
        """
        Insert new phone numbers into the call queue (status=pending).
        Skips numbers already in queue with status pending or calling.
        Returns list of newly created queue items.
        """
        created = []
        for phone in phone_numbers:
            phone = phone.strip()
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
        """Background task: process all pending queue items one by one."""
        logger.info(f"[Campaign {campaign_id}] Queue processor started")
        processed = 0
        failed = 0

        try:
            async with SessionLocal() as db:
                # Fetch all pending items
                result = await db.execute(
                    select(CallQueue)
                    .where(CallQueue.status == "pending")
                    .where(CallQueue.attempts < MAX_RETRY_ATTEMPTS)
                    .order_by(CallQueue.created_at.asc())
                )
                items = result.scalars().all()

            logger.info(f"[Campaign {campaign_id}] Found {len(items)} pending items")

            for item in items:
                try:
                    success = await self._call_number(item)
                    if success:
                        processed += 1
                    else:
                        failed += 1
                    await asyncio.sleep(CALL_INTERVAL_SECONDS)
                except Exception as e:
                    logger.error(
                        f"[Campaign {campaign_id}] Error processing {item.phone_number}: {e}",
                        exc_info=True,
                    )
                    failed += 1

        except Exception as e:
            logger.error(f"[Campaign {campaign_id}] Fatal error: {e}", exc_info=True)

        logger.info(
            f"[Campaign {campaign_id}] Finished — processed={processed} failed={failed}"
        )

    async def _call_number(self, item: CallQueue) -> bool:
        """
        Trigger a single Twilio outbound call for a queue item.
        Updates DB status throughout the lifecycle.
        Returns True if call was successfully initiated.
        """
        async with SessionLocal() as db:
            # Mark as calling + increment attempts
            await db.execute(
                update(CallQueue)
                .where(CallQueue.id == item.id)
                .values(status="calling", attempts=CallQueue.attempts + 1)
            )
            await db.commit()

            # Ensure lead exists
            await self._get_or_create_lead(db, item.phone_number)

        try:
            call_sid = await self._trigger_twilio_call(item.phone_number)
            logger.info(f"[Queue] Initiated Twilio call {call_sid} for {item.phone_number}")
            # Status stays "calling" — /twilio/status webhook will update it
            return True

        except Exception as e:
            logger.error(f"[Queue] Twilio call failed for {item.phone_number}: {e}")
            async with SessionLocal() as db:
                new_status = "failed" if item.attempts + 1 >= MAX_RETRY_ATTEMPTS else "pending"
                await db.execute(
                    update(CallQueue)
                    .where(CallQueue.id == item.id)
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
    def _build_lead_context(lead: Lead) -> dict:
        return {
            "name":               lead.name,
            "age":                lead.age,
            "occupation":         lead.occupation,
            "location":           lead.location,
            "insurance_interest": lead.insurance_interest,
            "last_summary":       lead.last_summary,
        }
