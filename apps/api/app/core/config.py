"""Application settings loaded from environment variables.

Uses pydantic-settings — har bir setting ENV dan o'qiladi, type-check qilinadi.
Ishlatish: `from app.core.config import settings` keyin `settings.DATABASE_URL` va h.k.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ─── App ──────────────────────────────────────────────
    APP_NAME: str = "Internship CHDPU"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_DEBUG: bool = False
    APP_URL: str = "http://localhost:8000"
    WEB_URL: str = "http://localhost:5173"

    # ─── Database ─────────────────────────────────────────
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://chdpu:chdpu_dev@localhost:5432/chdpu_dev",
        description="Async SQLAlchemy URL",
    )

    # ─── Redis ────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ─── Security ─────────────────────────────────────────
    SECRET_KEY: str = Field(
        default="dev-only-change-me",
        min_length=16,
        description="JWT signing key. Prod'da openssl rand -hex 32 bilan yarating.",
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TTL_MIN: int = 15
    JWT_REFRESH_TTL_DAYS: int = 7

    # ─── CORS ─────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # ─── Super Admin seed ─────────────────────────────────
    SUPERADMIN_USERNAME: str = "superadmin"
    SUPERADMIN_PASSWORD: str = "SuperSecret123!"  # noqa: S105  # dev default; prod .env da override qilinadi
    SUPERADMIN_EMAIL: str = "admin@chdpu.uz"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
