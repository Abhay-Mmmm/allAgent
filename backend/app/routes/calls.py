"""
Calls Routes
============
Access completed call session records.

GET /calls              — Paginated call session history
GET /calls/{id}         — Single call session with full transcript
"""

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import CallSession, Lead
from app.schemas.schemas import CallSessionListResponse, CallSessionResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calls", tags=["calls"])


# ──────────────────────────────────────────────
#  GET /calls
# ──────────────────────────────────────────────

@router.get("", response_model=CallSessionListResponse)
async def list_calls(
    page:    int = Query(1, ge=1),
    limit:   int = Query(20, ge=1, le=100),
    lead_id: Optional[str] = Query(None, description="Filter by lead UUID"),
    db:      AsyncSession = Depends(get_db),
):
    """Return paginated call session history, newest first."""
    offset = (page - 1) * limit
    query = select(CallSession).order_by(CallSession.timestamp.desc())
    count_query = select(func.count(CallSession.id))

    if lead_id:
        try:
            lid = uuid.UUID(lead_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid lead_id format")
        query = query.where(CallSession.lead_id == lid)
        count_query = count_query.where(CallSession.lead_id == lid)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(query.limit(limit).offset(offset))
    sessions = result.scalars().all()

    return CallSessionListResponse(
        calls=[CallSessionResponse.model_validate(s) for s in sessions],
        total=total,
        page=page,
        limit=limit,
    )


# ──────────────────────────────────────────────
#  GET /calls/{session_id}
# ──────────────────────────────────────────────

@router.get("/{session_id}")
async def get_call(session_id: str, db: AsyncSession = Depends(get_db)):
    """Return a single call session including the lead profile."""
    try:
        uid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    result = await db.execute(select(CallSession).where(CallSession.id == uid))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Call session not found")

    # Fetch the lead for this call
    lead_result = await db.execute(select(Lead).where(Lead.id == session.lead_id))
    lead = lead_result.scalars().first()

    from app.schemas.schemas import LeadResponse
    return {
        "call_session": CallSessionResponse.model_validate(session),
        "lead": LeadResponse.model_validate(lead) if lead else None,
    }
