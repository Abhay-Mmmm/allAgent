"""
Queue Routes
============
Manage the outbound call queue and run campaigns.

POST /queue/add       — Add phone numbers to queue
POST /queue/start     — Start calling campaign (background)
GET  /queue           — View queue items + stats
GET  /queue/stats     — Queue stats only
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.schemas import (
    AddToQueueRequest,
    CampaignStartResponse,
    QueueListResponse,
    QueueStatsResponse,
)
from app.services.queue_manager import QueueManager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/queue", tags=["queue"])


def _get_queue_manager() -> QueueManager:
    """FastAPI dependency — instantiate QueueManager."""
    try:
        return QueueManager()
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ──────────────────────────────────────────────
#  POST /queue/add
# ──────────────────────────────────────────────

@router.post("/add")
async def add_to_queue(
    payload: AddToQueueRequest,
    db:      AsyncSession = Depends(get_db),
):
    """Add phone numbers (with optional names) to the outbound calling queue."""
    entries = payload.get_entries()
    if not entries:
        raise HTTPException(status_code=400, detail="At least one phone number is required")

    created = await QueueManager.add_to_queue(db, entries)
    return {
        "message": f"Added {len(created)} numbers to the queue",
        "added":   len(created),
        "skipped": len(entries) - len(created),
    }


# ──────────────────────────────────────────────
#  POST /queue/start
# ──────────────────────────────────────────────

@router.post("/start", response_model=CampaignStartResponse)
async def start_campaign(
    manager: QueueManager = Depends(_get_queue_manager),
):
    """
    Start processing the pending call queue.
    Runs all pending calls sequentially in the background.
    Returns immediately with a campaign ID.
    """
    result = await manager.start_campaign()
    return CampaignStartResponse(
        campaign_id=result["campaign_id"],
        status=result["status"],
        message="Campaign started — calls will be made sequentially in the background",
    )


# ──────────────────────────────────────────────
#  GET /queue
# ──────────────────────────────────────────────

@router.get("", response_model=QueueListResponse)
async def get_queue(
    page:   int = Query(1, ge=1),
    limit:  int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None, description="Filter: pending|calling|completed|failed"),
    db:     AsyncSession = Depends(get_db),
):
    """Return all queue items with current stats."""
    from sqlalchemy import func, select
    from app.db.models import CallQueue

    offset = (page - 1) * limit

    # Items
    items = await QueueManager.get_queue_items(db, status=status, limit=limit, offset=offset)

    # Total count
    count_query = select(func.count(CallQueue.id))
    if status:
        count_query = count_query.where(CallQueue.status == status)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Stats
    stats = await QueueManager.get_queue_stats(db)

    from app.schemas.schemas import QueueItemResponse

    # Map phone → lead name for display
    phones = [i.phone_number for i in items]
    lead_rows = []
    if phones:
        from app.db.models import Lead
        lead_result = await db.execute(select(Lead).where(Lead.phone_number.in_(phones)))
        lead_rows = lead_result.scalars().all()
    name_map = {l.phone_number: l.name for l in lead_rows}

    item_responses = []
    for i in items:
        resp = QueueItemResponse.model_validate(i)
        resp.lead_name = name_map.get(i.phone_number)
        item_responses.append(resp)

    return QueueListResponse(
        items=item_responses,
        stats=QueueStatsResponse(**stats),
        total=total,
        page=page,
        limit=limit,
    )


# ──────────────────────────────────────────────
#  GET /queue/stats
# ──────────────────────────────────────────────

@router.get("/stats", response_model=QueueStatsResponse)
async def get_queue_stats(db: AsyncSession = Depends(get_db)):
    """Return queue status counts only (lightweight dashboard polling)."""
    stats = await QueueManager.get_queue_stats(db)
    return QueueStatsResponse(**stats)
