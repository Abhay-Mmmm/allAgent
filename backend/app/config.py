from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Absolute path to the single root .env, regardless of working directory
_ROOT_ENV = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ROOT_ENV),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "postgresql://allagent:allagent_local@localhost:5432/allagent"

    @property
    def async_database_url(self) -> str:
        """Convert sync postgres:// URL to asyncpg+postgresql:// for SQLAlchemy."""
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url

    # ── App environment ───────────────────────────────────────────────────────
    app_env: str = "development"
    log_level: str = "INFO"
    cors_origins_raw: str = "*"

    @property
    def cors_origins(self) -> list[str]:
        if self.cors_origins_raw.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    # ── Twilio ────────────────────────────────────────────────────────────────
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    twilio_base_url: str = "http://localhost:8000"

    # ── Groq ──────────────────────────────────────────────────────────────────
    groq_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
