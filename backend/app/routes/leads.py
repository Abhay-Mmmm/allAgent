"""
Leads Routes
============
CRUD endpoints for lead profiles.

GET  /leads             — Paginated lead list
GET  /leads/{id}        — Single lead with call history
POST /leads/import      — Import CSV of phone numbers
"""

import csv
import io
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import CallSession, Lead
from app.schemas.schemas import (
    ImportResponse,
    LeadListResponse,
    LeadResponse,
    CallSessionResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/leads", tags=["leads"])


# ──────────────────────────────────────────────
#  GET /leads
# ──────────────────────────────────────────────

@router.get("", response_model=LeadListResponse)
async def list_leads(
    page:   int = Query(1, ge=1),
    limit:  int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by lead_status"),
    db:     AsyncSession = Depends(get_db),
):
    """Return a paginated list of all leads."""
    offset = (page - 1) * limit
    query = select(Lead).order_by(Lead.updated_at.desc())
    count_query = select(func.count(Lead.id))

    if status:
        query = query.where(Lead.lead_status == status)
        count_query = count_query.where(Lead.lead_status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(query.limit(limit).offset(offset))
    leads = result.scalars().all()

    return LeadListResponse(
        leads=[LeadResponse.model_validate(l) for l in leads],
        total=total,
        page=page,
        limit=limit,
    )


# ──────────────────────────────────────────────
#  GET /leads/{lead_id}
# ──────────────────────────────────────────────

@router.get("/{lead_id}")
async def get_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    """Return a single lead profile including their full call history."""
    try:
        uid = uuid.UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid lead ID format")

    result = await db.execute(select(Lead).where(Lead.id == uid))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Fetch call sessions for this lead
    sessions_result = await db.execute(
        select(CallSession)
        .where(CallSession.lead_id == uid)
        .order_by(CallSession.timestamp.desc())
    )
    sessions = sessions_result.scalars().all()

    return {
        "lead": LeadResponse.model_validate(lead),
        "call_sessions": [CallSessionResponse.model_validate(s) for s in sessions],
        "total_calls": len(sessions),
    }


# ──────────────────────────────────────────────
#  POST /leads/import
# ──────────────────────────────────────────────

@router.post("/import", response_model=ImportResponse)
async def import_leads_csv(
    file: UploadFile = File(...),
    db:   AsyncSession = Depends(get_db),
):
    """
    Upload a CSV file containing phone numbers to import as leads.

    CSV format (header optional):
      phone_number
      +91XXXXXXXXXX
      +91YYYYYYYYYY
      ...

    The first column is always treated as the phone number.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are accepted (.csv extension required)",
        )

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")  # handle BOM
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.reader(io.StringIO(text))
    phone_numbers = []

    for i, row in enumerate(reader):
        if not row:
            continue
        candidate = row[0].strip()
        # Skip header rows
        if i == 0 and candidate.lower() in ("phone_number", "phone", "number", "mobile"):
            continue
        if candidate:
            phone_numbers.append(candidate)

    if not phone_numbers:
        raise HTTPException(status_code=400, detail="No valid phone numbers found in CSV")

    imported = 0
    skipped = 0
    errors = 0

    for phone in phone_numbers:
        try:
            existing = await db.execute(
                select(Lead).where(Lead.phone_number == phone)
            )
            if existing.scalars().first():
                skipped += 1
                continue

            lead = Lead(
                id=uuid.uuid4(),
                phone_number=phone,
                lead_status="new",
            )
            db.add(lead)
            imported += 1
        except Exception as e:
            logger.error(f"[import] Error processing {phone}: {e}")
            errors += 1

    await db.commit()
    logger.info(
        f"[import] CSV import complete: imported={imported} skipped={skipped} errors={errors}"
    )

    return ImportResponse(
        imported=imported,
        skipped=skipped,
        errors=errors,
        message=f"Import complete: {imported} new leads added, {skipped} already existed, {errors} errors",
    )
