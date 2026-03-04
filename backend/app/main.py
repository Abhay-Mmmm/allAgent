"""
AllAgent Backend — FastAPI Application Entry Point (v2.1.0)
PostgreSQL on Railway via asyncpg + SQLAlchemy 2.x
"""
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv, find_dotenv

# Locate and load .env by searching upward from this file (works from any CWD)
load_dotenv(find_dotenv(usecwd=False, raise_error_if_not_found=False))

from app.config import get_settings
from app.db.database import engine, Base
# Import models so Base.metadata is populated before create_all
from app.db import models  # noqa: F401
from app.routes import chat, voice, vapi

# ──────────────────────────────────────────────
#  Logging
# ──────────────────────────────────────────────
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
#  Lifespan — DB init on startup
# ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    On startup: verify DB connection and create all tables (MVP approach).
    On shutdown: dispose connection pool cleanly.
    """
    logger.info("Starting AllAgent backend — connecting to PostgreSQL...")
    try:
        async with engine.begin() as conn:
            # Create all tables if they don't exist
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Database connected and schema is up-to-date.")
    except Exception as e:
        logger.critical(f"❌ Database connection failed on startup: {e}")
        logger.critical("Verify DATABASE_URL is set correctly and Railway is reachable.")
        # In production fail fast; in dev allow server to start for debugging
        if settings.is_production:
            sys.exit(1)

    yield

    # Graceful shutdown
    await engine.dispose()
    logger.info("Database connection pool disposed.")


# ──────────────────────────────────────────────
#  Application
# ──────────────────────────────────────────────

app = FastAPI(
    lifespan=lifespan,
    title="AllAgent Backend",
    description=(
        "AI-powered insurance assistant with VAPI voice integration "
        "and Railway PostgreSQL persistence."
    ),
    version="2.1.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# ──────────────────────────────────────────────
#  CORS
# ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
#  Routers
# ──────────────────────────────────────────────
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(voice.router, prefix="/api", tags=["voice-emulated"])
app.include_router(vapi.router, prefix="/api", tags=["vapi-voice"])


# ──────────────────────────────────────────────
#  Health Endpoints
# ──────────────────────────────────────────────

@app.get("/", tags=["health"])
def read_root():
    return {
        "status": "online",
        "service": "AllAgent Backend",
        "version": "2.1.0",
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
