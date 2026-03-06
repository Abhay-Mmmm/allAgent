"""
Centralised application configuration — Outbound AI Sales Platform.
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
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


def _find_env_file() -> str:
    """
    Locate the .env file by searching upward from this file's location.
    Returns the path to the first .env found, or '.env' as a fallback.
    """
    current = Path(__file__).resolve().parent
    for _ in range(4):  # max 4 levels up
        candidate = current / ".env"
        if candidate.exists():
            return str(candidate)
        current = current.parent
    return ".env"


_ENV_FILE = _find_env_file()


class Settings(BaseSettings):
    # ── Database (Railway PostgreSQL) ─────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/allagent"

    # ── App ───────────────────────────────────────────────────────────────────
    app_env:   str = "development"  # development | production
    log_level: str = "INFO"

    # CORS — comma-separated list of allowed origins
    cors_origins_raw: str = "*"

    # ── LLM — Groq (ONLY LLM provider) ───────────────────────────────────────
    groq_api_key: str = ""

    # ── Twilio (native TwiML voice loop) ─────────────────────────────────────
    twilio_account_sid:  str = ""
    twilio_auth_token:   str = ""
    twilio_phone_number: str = ""   # E.164, e.g. +14155551234
    # Public base URL reachable by Twilio — e.g. your ngrok HTTPS URL.
    # If empty, the webhook derives it from the incoming request Host header.
    twilio_base_url:     str = ""   # e.g. https://abc.ngrok-free.app

    # ── Frontend (Vite) — read by the browser, listed here for completeness ──
    vite_app_title:    str = "allAgent"
    vite_api_base_url: str = "http://localhost:8000/api"

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",  # Silently ignore any unknown keys (e.g. VITE_*)
    )

    # ── Computed properties ───────────────────────────────────────────────────

    @property
    def async_database_url(self) -> str:
        """Convert postgresql:// to postgresql+asyncpg:// for SQLAlchemy asyncpg driver."""
        url = self.database_url
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return url.replace(prefix, "postgresql+asyncpg://", 1)
        return url  # already correct

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def cors_origins(self) -> List[str]:
        """Parse comma-separated CORS_ORIGINS_RAW into a list."""
        raw = self.cors_origins_raw.strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]


@lru_cache()
def get_settings() -> Settings:
    """Return a cached Settings singleton. Safe to call anywhere."""
    return Settings()
