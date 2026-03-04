"""
Alembic environment configuration for async SQLAlchemy + Railway PostgreSQL.

This env.py:
  - Loads DATABASE_URL from environment (never hardcoded)
  - Uses async engine (asyncpg)
  - Imports all models via app.db.base so autogenerate detects the full schema
"""
import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# ── Load environment before importing app modules ────────────────────────
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(usecwd=False, raise_error_if_not_found=False))

# ── Import app config and all models (registers metadata) ────────────────
from app.config import get_settings
from app.db.base import Base  # noqa: F401 — registers User, Session on metadata

# ── Alembic Config object ─────────────────────────────────────────────────
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate
target_metadata = Base.metadata


def get_url() -> str:
    """Read DATABASE_URL from env and ensure it uses asyncpg."""
    settings = get_settings()
    return settings.async_database_url


# ── Offline mode (generates SQL without connecting) ───────────────────────
def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode (connects and runs migrations) ────────────────────────────
def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Create async engine and run migrations in async context."""
    connectable = create_async_engine(
        get_url(),
        poolclass=pool.NullPool,  # No pooling in migration runs
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


# ── Entry point ───────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
