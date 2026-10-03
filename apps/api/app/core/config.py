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

    # ─── Auto-generated student login ─────────────────────
    # Excel import paytida talabalarga avtomatik login beriladi: "{prefix}{8 raqam}"
    # Masalan 2025-2026 o'quv yili uchun prefiks "2500" → "250012345678"
    LOGIN_YEAR_PREFIX: str = "2500"
    # 15 daqiqadagi xato loginlar: har bir login uchun va bitta IP uchun (kampus NAT — yuqori)
    LOGIN_MAX_FAILS_PER_USER: int = 10
    LOGIN_MAX_FAILS_PER_IP: int = 300


def _is_placeholder_secret(value: str) -> bool:
    """Namuna (.env.example) yoki juda qisqa kalit — ommaviy repoda ko'rinib turadi."""
    v = value.strip()
    return len(v) < 16 or "change" in v.lower() or v in {"dev-only-change-me", "secret"}


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.APP_ENV == "production":
        import warnings

        # SECRET_KEY bilan JWT imzolanadi: namunadagi qiymat bo'lsa, istalgan kishi admin
        # tokenini soxtalashtira oladi — bunday holatda ishga tushmaymiz (jim ogohlantirish emas).
        if _is_placeholder_secret(s.SECRET_KEY):
            raise RuntimeError(
                "SECRET_KEY production'da namuna/standart qiymatda yoki juda qisqa. "
                ".env.prod da yangilang: openssl rand -hex 32"
            )
        if s.SUPERADMIN_PASSWORD == "SuperSecret123!" or "change" in s.SUPERADMIN_PASSWORD.lower():  # noqa: S105
            warnings.warn("SUPERADMIN_PASSWORD production'da standart qiymatda!", stacklevel=1)
        if not s.WEB_URL.startswith("http"):
            warnings.warn("WEB_URL bo'sh — shartnoma QR kodlari ishlamaydi!", stacklevel=1)
    return s


settings = get_settings()
