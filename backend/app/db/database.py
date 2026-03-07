"""
Async SQLAlchemy engine + session factory for Railway PostgreSQL.

Key decisions:
  - asyncpg driver for maximum async throughput
  - NullPool in production (Railway's managed Postgres handles pooling externally)
  - QueuePool for local dev to reduce connection churn
  - SSL handled in the URL via ?sslmode=require (set in Railway env)
  - Base imported here so models only need to import from one place
"""
import logging
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
#  Declarative Base
# ──────────────────────────────────────────────

class Base(DeclarativeBase):
    """Single shared declarative base for all ORM models."""
    pass


# ──────────────────────────────────────────────
#  Engine Factory
# ──────────────────────────────────────────────

def _create_engine():
    settings = get_settings()
    db_url = settings.async_database_url

    # Mask credentials in logs
    safe_url = db_url.split("@")[-1] if "@" in db_url else db_url
    logger.info(f"Connecting to database: @{safe_url}")

    # Determine SSL setting from original URL
    needs_ssl = "sslmode=require" in settings.database_url

    # Strip sslmode from URL — asyncpg does not support it as a query param
    if "sslmode=" in db_url:
        from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
        parsed = urlparse(db_url)
        params = parse_qs(parsed.query)
        params.pop("sslmode", None)
        clean_query = urlencode(params, doseq=True)
        db_url = urlunparse(parsed._replace(query=clean_query))

    engine_kwargs = dict(
        echo=not settings.is_production,   # SQL query logging in dev
        pool_pre_ping=True,                # Detect stale connections
        pool_recycle=300,                  # Recycle connections every 5 min
    )

    if needs_ssl:
        import ssl as _ssl
        ssl_ctx = _ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = _ssl.CERT_NONE
        engine_kwargs["connect_args"] = {"ssl": ssl_ctx}

    if settings.is_production:
        # Railway manages PgBouncer / external pooling — use NullPool
        from sqlalchemy.pool import NullPool
        engine_kwargs["poolclass"] = NullPool
    else:
        # Local dev: small in-process pool
        engine_kwargs["pool_size"] = 5
        engine_kwargs["max_overflow"] = 10

    return create_async_engine(db_url, **engine_kwargs)


engine = _create_engine()

SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    class_=AsyncSession,
    expire_on_commit=False,  # Keep objects usable after commit
)


# ──────────────────────────────────────────────
#  FastAPI Dependency
# ──────────────────────────────────────────────

async def get_db() -> AsyncSession:
    """
    FastAPI dependency that provides a scoped async DB session.
    Automatically rolled back on exceptions, closed on exit.
    """
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
