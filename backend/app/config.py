"""
Centralised application configuration.
All settings are loaded from environment variables via pydantic-settings.
Never hardcode secrets — always use .env or Railway environment variables.

.env search order (first file found wins):
  1. Project root:   allAgent/.env           ← canonical location
  2. Backend parent: backend/../.env          ← same as above when run from backend/
  3. Current dir:    ./.env                  ← fallback for Docker / Railway
"""
import os
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


def _find_env_file() -> str:
    """
    Locate the .env file by searching upward from this file's location.
    Returns the path to the first .env found, or '.env' as a fallback.
    """
    # Walk up from backend/app/ → backend/ → allAgent/ (project root)
    current = Path(__file__).resolve().parent
    for _ in range(4):  # max 4 levels up
        candidate = current / ".env"
        if candidate.exists():
            return str(candidate)
        current = current.parent
    return ".env"  # let pydantic-settings raise a clear error if missing


_ENV_FILE = _find_env_file()


class Settings(BaseSettings):
    # ── Database ─────────────────────────────────────────────────────────────
    # Railway injects DATABASE_URL automatically when a Postgres plugin is added.
    # Format:  postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
    # We auto-convert postgresql:// → postgresql+asyncpg:// for async SQLAlchemy.
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/allagent"

    # ── App ───────────────────────────────────────────────────────────────────
    app_env: str = "development"   # development | production
    log_level: str = "INFO"

    # ── LLM — Groq ────────────────────────────────────────────────────────────
    groq_api_key: str = ""

    # ── VAPI Voice AI ─────────────────────────────────────────────────────────
    vapi_api_key: str = ""
    vapi_phone_number_id: str = ""
    vapi_server_url: str = ""
    vapi_webhook_secret: str = ""

    # ── Frontend vars (read by Vite, not by the backend — listed for completeness)
    # These are here purely so pydantic-settings doesn't error on VITE_* keys
    # when reading the shared root .env file.
    vite_app_title: str = "allAgent"
    vite_api_base_url: str = "http://localhost:8000/api"
    vite_enable_voice_calls: str = "true"
    vite_enable_document_scanner: str = "true"
    vite_enable_multilingual: str = "false"
    vite_debug_mode: str = "false"

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        # Silently ignore any extra keys in .env (e.g. VITE_* keys)
        extra="ignore",
    )

    # ── Computed properties ───────────────────────────────────────────────────

    @property
    def async_database_url(self) -> str:
        """
        Convert a plain postgresql:// (or postgres://) URL to
        postgresql+asyncpg:// for use with SQLAlchemy asyncpg driver.
        Railway and most providers supply the plain form.
        """
        url = self.database_url
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return url.replace(prefix, "postgresql+asyncpg://", 1)
        return url  # already has the correct driver prefix

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache()
def get_settings() -> Settings:
    """Return a cached Settings singleton. Safe to call anywhere."""
    return Settings()
