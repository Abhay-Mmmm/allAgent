"""
Call Queue Manager
==================
Manages the outbound call queue and orchestrates VAPI calls.

Responsibilities:
  - Add phone numbers to the queue (single or batch)
  - Process the queue sequentially (one active call at a time)
  - Trigger VAPI outbound calls
  - Update queue item status after each call
  - Retry logic for failed calls (max 3 attempts)

Queue states:
  pending   → ready to be called
  calling   → VAPI call in-flight
  completed → call ended successfully and webhook received
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

VAPI_API_BASE = "https://api.vapi.ai"
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
        self.vapi_api_key       = settings.vapi_api_key
        self.phone_number_id    = settings.vapi_phone_number_id
        self.server_url         = settings.vapi_server_url
        self.groq_api_key       = settings.groq_api_key

        if not self.vapi_api_key:
            raise ValueError("VAPI_API_KEY is not set — cannot make outbound calls")

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
        Trigger a single VAPI outbound call for a queue item.
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
            lead = await self._get_or_create_lead(db, item.phone_number)
            lead_context = self._build_lead_context(lead)

        try:
            call_result = await self._trigger_vapi_call(item.phone_number, lead_context)
            vapi_call_id = call_result.get("id", "unknown")
            logger.info(f"[Queue] Initiated VAPI call {vapi_call_id} for {item.phone_number}")
            # Status stays "calling" — webhook will update to "completed"
            return True

        except Exception as e:
            logger.error(f"[Queue] VAPI call failed for {item.phone_number}: {e}")
            async with SessionLocal() as db:
                new_status = "failed" if item.attempts + 1 >= MAX_RETRY_ATTEMPTS else "pending"
                await db.execute(
                    update(CallQueue)
                    .where(CallQueue.id == item.id)
                    .values(status=new_status)
                )
                await db.commit()
            return False

    async def _trigger_vapi_call(
        self, phone_number: str, lead_context: dict
    ) -> dict:
        """POST to VAPI /call to initiate an outbound call."""
        from app.services.groq_service import get_groq_service
        groq = get_groq_service()
        system_prompt = groq.build_outbound_system_prompt(lead_context)

        name = lead_context.get("name") or "Prospect"
        greeting = (
            f"Hello! Am I speaking with {name}? "
            "This is an advisor from allAgent, your AI-powered insurance assistant. "
            "I'm calling to help you explore insurance options that might be a great fit for you. "
            "Do you have a few minutes to chat?"
        ) if name != "Prospect" else (
            "Hello! This is an advisor from allAgent, your AI-powered insurance assistant. "
            "I'm calling to help you explore insurance options. "
            "May I know who I'm speaking with?"
        )

        payload = {
            "phoneNumberId": self.phone_number_id,
            "customer": {"number": phone_number},
            "assistant": {
                "name": "allAgent Insurance Advisor",
                "firstMessage": greeting,
                "model": {
                    "provider": "groq",
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "system", "content": system_prompt}],
                    "temperature": 0.6,
                    "maxTokens": 512,
                },
                "voice": {
                    "provider": "11labs",
                    "voiceId": "21m00Tcm4TlvDq8ikWAM",  # Rachel — warm, professional
                },
                "transcriber": {
                    "provider": "deepgram",
                    "model": "nova-2",
                    "language": "en",
                },
                "serverUrl": self.server_url,
                "endCallFunctionEnabled": True,
                "silenceTimeoutSeconds": 30,
                "maxDurationSeconds": 600,
                "backgroundSound": "off",
            },
        }

        headers = {
            "Authorization": f"Bearer {self.vapi_api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{VAPI_API_BASE}/call",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()

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
