"""
Database connection and schema verification script.

Run from the backend/ directory:
    python test_db.py

Tests:
  1. Connection to PostgreSQL
  2. Table existence (leads, call_sessions)
  3. Create a test lead
  4. Create a test call session
  5. Retrieve and verify data
  6. Cleanup test data
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.config import get_settings
from app.db.database import Base
from app.db.models import Lead, CallSession  # noqa: F401


async def run_tests():
    settings = get_settings()
    db_url = settings.async_database_url

    # Mask password in log output
    safe = db_url.split("@")[-1] if "@" in db_url else db_url
    print(f"\n🔌 Connecting to: @{safe}")

    engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)
    SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    try:
        # ── TEST 1: Basic connectivity ─────────────────────────────────────
        print("\n[TEST 1] Basic connectivity...")
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"  ✅ PostgreSQL version: {version[:40]}...")

        # ── TEST 2: Create tables ──────────────────────────────────────────
        print("\n[TEST 2] Creating tables (create_all)...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("  ✅ Tables created (or already exist)")

        # ── TEST 3: Verify tables exist ────────────────────────────────────
        print("\n[TEST 3] Verifying table existence...")
        async with engine.connect() as conn:
            for table in ["leads", "call_sessions", "call_queue"]:
                result = await conn.execute(
                    text(
                        "SELECT EXISTS ("
                        "  SELECT 1 FROM information_schema.tables"
                        f" WHERE table_name = '{table}'"
                        ")"
                    )
                )
                exists = result.scalar()
                status = "✅" if exists else "❌"
                print(f"  {status} Table '{table}': {'exists' if exists else 'MISSING'}")
                if not exists:
                    sys.exit(1)

        async with SessionLocal() as db:
            test_user_id = uuid.uuid4()
            test_phone = f"+91_test_{test_user_id.hex[:8]}"

            # ── TEST 4: Insert a lead ──────────────────────────────────────
            print("\n[TEST 4] Inserting test lead...")
            lead = Lead(
                id=test_user_id,
                phone_number=test_phone,
                name="Test Lead",
                age=30,
                occupation="Engineer",
                location="Mumbai",
                insurance_interest="health",
                lead_status="new",
            )
            db.add(lead)
            await db.commit()
            await db.refresh(lead)
            print(f"  ✅ Lead created: id={lead.id}, name={lead.name}")

            # ── TEST 5: Insert a call session ───────────────────────────────────
            print("\n[TEST 5] Inserting test session...")
            session = CallSession(
                id=uuid.uuid4(),
                lead_id=test_user_id,
                call_sid=f"CA{uuid.uuid4().hex[:30]}",
                transcript="User: Hello\nAI: How can I help?",
                structured_data={"name": "Test Lead", "insurance_interest": "health"},
                call_duration=45,
            )
            db.add(session)
            await db.commit()
            print(f"  ✅ Session created: call_sid={session.call_sid}")

            # ── TEST 6: Retrieve and verify ────────────────────────────────
            print("\n[TEST 6] Retrieving and verifying data...")
            from sqlalchemy.future import select
            result = await db.execute(select(Lead).where(Lead.id == test_user_id))
            fetched = result.scalars().first()
            assert fetched is not None, "Lead not found after insert!"
            assert fetched.name == "Test Lead"
            assert fetched.age == 30
            print(f"  ✅ Lead retrieved: {fetched.name}, age={fetched.age}")

            # ── TEST 7: JSONB query ────────────────────────────────────────
            print("\n[TEST 7] JSONB query on structured_data...")
            result = await db.execute(
                text(
                    "SELECT call_sid, structured_data "
                    "FROM call_sessions "
                    "WHERE structured_data->>'insurance_interest' = 'health'"
                )
            )
            rows = result.fetchall()
            print(f"  ✅ JSONB query returned {len(rows)} row(s)")

            # ── CLEANUP ────────────────────────────────────────────────────
            print("\n[CLEANUP] Removing test data...")
            await db.execute(
                text(f"DELETE FROM call_sessions WHERE lead_id = '{test_user_id}'")
            )
            await db.execute(
                text(f"DELETE FROM leads WHERE id = '{test_user_id}'")
            )
            await db.commit()
            print("  ✅ Test data removed")

        print("\n" + "="*50)
        print("✅ ALL TESTS PASSED — Railway PostgreSQL is ready!")
        print("="*50 + "\n")

    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_tests())
