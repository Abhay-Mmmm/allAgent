"""
Base import aggregator.

Import this module in Alembic's env.py so that all models are registered
on the shared metadata before autogenerate runs.

Usage in alembic/env.py:
    from app.db.base import Base  # noqa: F401 — registers all models
    from app.db.base import *     # if you want models explicitly
"""
from app.db.database import Base  # noqa: F401
from app.db.models import Lead, CallSession, CallQueue  # noqa: F401 — register metadata

__all__ = ["Base", "Lead", "CallSession", "CallQueue"]
