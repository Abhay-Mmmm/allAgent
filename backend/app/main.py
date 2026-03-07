"""
AllAgent — Outbound AI Sales Calling Platform
FastAPI Application Entry Point (v3.0.0)

Architecture:
  - Groq (llama-3.3-70b) for all LLM reasoning
  - Twilio for outbound voice calling (TwiML AI conversation loop)
  - Railway PostgreSQL via asyncpg + SQLAlchemy 2.x
"""
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv, find_dotenv

# Load .env before importing anything that reads settings
load_dotenv(find_dotenv(usecwd=False, raise_error_if_not_found=False))

from app.config import get_settings
from app.db.database import engine, Base
# Import models so Base.metadata is populated before create_all
from app.db import models  # noqa: F401
from app.routes import leads, queue, calls, twilio

# ──────────────────────────────────────────────
#  Logging
# ──────────────────────────────────────────────
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=open(sys.stdout.fileno(), mode="w", encoding="utf-8", buffering=1),
)
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
#  Lifespan — DB init on startup
# ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AllAgent Outbound Calling Platform - connecting to PostgreSQL...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("[OK] Database connected and schema is up-to-date.")
    except Exception as e:
        logger.critical(f"[ERROR] Database connection failed on startup: {e}")
        logger.critical("Verify DATABASE_URL is set correctly in .env / Railway.")
        if settings.is_production:
            sys.exit(1)

    yield

    await engine.dispose()
    logger.info("Database connection pool disposed.")


# ──────────────────────────────────────────────
#  Application
# ──────────────────────────────────────────────

app = FastAPI(
    lifespan=lifespan,
    title="AllAgent — Outbound AI Sales Calling Platform",
    description=(
        "Operator dashboard for AI-powered outbound insurance sales calls. "
        "Uses Groq (llama-3.3-70b) for reasoning and Twilio for voice calls. "
        "Backed by Railway PostgreSQL."
    ),
    version="3.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# ──────────────────────────────────────────────
#  CORS — allow operator dashboard origin
# ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
#  Routers
# ──────────────────────────────────────────────
app.include_router(leads.router,   prefix="/api")
app.include_router(queue.router,   prefix="/api")
app.include_router(calls.router,   prefix="/api")
app.include_router(twilio.router,  prefix="/api")


# ──────────────────────────────────────────────
#  Health Endpoints
# ──────────────────────────────────────────────

@app.get("/", tags=["health"])
def read_root():
    return {
        "status": "online",
        "service": "AllAgent Outbound AI Sales Calling Platform",
        "version": "3.0.0",
        "env": settings.app_env,
    }


@app.get("/health", tags=["health"])
async def health_check():
    """Lightweight health check for Railway + uptime monitors."""
    from sqlalchemy import text
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}
