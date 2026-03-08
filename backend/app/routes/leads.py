"""
Leads Routes
============
CRUD endpoints for lead profiles.

GET    /leads             — Paginated lead list
GET    /leads/{id}        — Single lead with call history
POST   /leads             — Create a new lead
PUT    /leads/{id}        — Update a lead
DELETE /leads/{id}        — Delete a lead
POST   /leads/import      — Import CSV of name + phone
"""

import csv
import io
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import CallSession, Lead
from app.schemas.schemas import (
    ImportResponse,
    LeadCreate,
    LeadListResponse,
    LeadResponse,
    LeadUpdate,
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
    phone:  Optional[str] = Query(None, description="Exact phone number lookup"),
    db:     AsyncSession = Depends(get_db),
):
    """Return a paginated list of all leads."""
    offset = (page - 1) * limit
    query = select(Lead).order_by(Lead.updated_at.desc())
    count_query = select(func.count(Lead.id))

    if status:
        query = query.where(Lead.lead_status == status)
        count_query = count_query.where(Lead.lead_status == status)

    if phone:
        query = query.where(Lead.phone_number == phone)
        count_query = count_query.where(Lead.phone_number == phone)

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
#  POST /leads
# ──────────────────────────────────────────────

@router.post("", response_model=LeadResponse, status_code=201)
async def create_lead(
    payload: LeadCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new lead. Phone number must be unique."""
    existing = await db.execute(
        select(Lead).where(Lead.phone_number == payload.phone_number)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="A lead with this phone number already exists")

    lead = Lead(
        id=uuid.uuid4(),
        phone_number=payload.phone_number,
        name=payload.name,
        location=payload.location,
        insurance_interest=payload.insurance_interest,
        lead_status=payload.lead_status or "new",
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)


# ──────────────────────────────────────────────
#  PUT /leads/{lead_id}
# ──────────────────────────────────────────────

@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    payload: LeadUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing lead's fields."""
    try:
        uid = uuid.UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid lead ID format")

    result = await db.execute(select(Lead).where(Lead.id == uid))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # If phone is being changed, check uniqueness
    if payload.phone_number and payload.phone_number != lead.phone_number:
        dup = await db.execute(
            select(Lead).where(Lead.phone_number == payload.phone_number)
        )
        if dup.scalars().first():
            raise HTTPException(status_code=409, detail="Another lead already has this phone number")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)

    await db.commit()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)


# ──────────────────────────────────────────────
#  DELETE /leads/{lead_id}
# ──────────────────────────────────────────────

@router.delete("/{lead_id}", status_code=204)
async def delete_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a lead and all associated call sessions (cascade)."""
    try:
        uid = uuid.UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid lead ID format")

    result = await db.execute(select(Lead).where(Lead.id == uid))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    await db.delete(lead)
    await db.commit()


# ──────────────────────────────────────────────
#  POST /leads/import
# ──────────────────────────────────────────────

@router.post("/import", response_model=ImportResponse)
async def import_leads_csv(
    file: UploadFile = File(...),
    db:   AsyncSession = Depends(get_db),
):
    """
    Upload a CSV file to import leads.

    Supported CSV formats:
      name,phone_number    — two-column with header
      phone_number         — single-column (legacy)

    If a phone number already exists, the lead record is updated (name etc.).
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
    rows_raw = list(reader)

    if not rows_raw:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    # Detect columns from header
    header = [c.strip().lower() for c in rows_raw[0]]
    has_header = False
    name_col = -1
    phone_col = -1

    phone_aliases = {"phone_number", "phone", "number", "mobile", "phonenumber"}
    name_aliases = {"name", "full_name", "fullname", "lead_name"}

    for i, h in enumerate(header):
        if h in phone_aliases:
            phone_col = i
            has_header = True
        elif h in name_aliases:
            name_col = i
            has_header = True

    data_rows = rows_raw[1:] if has_header else rows_raw

    # If no header detected, assume column 0/1 layout
    if phone_col == -1:
        if len(header) >= 2 and not has_header:
            name_col = 0
            phone_col = 1
        else:
            phone_col = 0

    imported = 0
    updated = 0
    errors = 0

    for row in data_rows:
        if not row:
            continue
        try:
            phone = row[phone_col].strip() if phone_col < len(row) else ""
            name = row[name_col].strip() if name_col >= 0 and name_col < len(row) else None

            if not phone:
                errors += 1
                continue

            existing_result = await db.execute(
                select(Lead).where(Lead.phone_number == phone)
            )
            existing = existing_result.scalars().first()

            if existing:
                # Update name if provided and different
                if name and name != existing.name:
                    existing.name = name
                updated += 1
            else:
                lead = Lead(
                    id=uuid.uuid4(),
                    phone_number=phone,
                    name=name,
                    lead_status="new",
                )
                db.add(lead)
                imported += 1
        except Exception as e:
            logger.error(f"[import] Error processing row {row}: {e}")
            errors += 1

    await db.commit()
    logger.info(
        f"[import] CSV import complete: imported={imported} updated={updated} errors={errors}"
    )

    return ImportResponse(
        imported=imported,
        updated=updated,
        skipped=0,
        errors=errors,
        message=f"Import complete: {imported} new leads, {updated} updated, {errors} errors",
    )
