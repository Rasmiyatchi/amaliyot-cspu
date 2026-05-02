"""SystemSettings service — singleton get/update + cache.

Bir nechta yozuvlar bo'lmasligini ta'minlash uchun har get'da birinchi yozuv
olinadi, yo'q bo'lsa default'lar bilan yaratiladi.

In-memory cache — middleware har request'da DB'ga bormasin uchun.
"""

import asyncio
from typing import Any

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_settings import SystemSettings

_cache: SystemSettings | None = None
_cache_lock = asyncio.Lock()


def _to_dict(s: SystemSettings) -> dict[str, Any]:
    return {
        "id": s.id,
        "site_name": s.site_name,
        "site_description": s.site_description,
        "max_file_size_mb": s.max_file_size_mb,
        "allowed_file_types": list(s.allowed_file_types or []),
        "email_notifications_enabled": s.email_notifications_enabled,
        "maintenance_mode": s.maintenance_mode,
        "maintenance_message": s.maintenance_message,
        "extra": s.extra or {},
        "created_at": s.created_at,
        "updated_at": s.updated_at,
    }


async def ensure_settings(db: AsyncSession) -> SystemSettings:
    """Singleton row mavjudligini ta'minlaydi."""
    existing = (await db.execute(select(SystemSettings).limit(1))).scalar_one_or_none()
    if existing:
        return existing
    s = SystemSettings()
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return s


async def get_settings(db: AsyncSession) -> dict[str, Any]:
    s = await ensure_settings(db)
    return _to_dict(s)


async def update_settings(db: AsyncSession, data: BaseModel) -> dict[str, Any]:
    global _cache
    s = await ensure_settings(db)
    payload = data.model_dump(exclude_unset=True)
    for key, value in payload.items():
        setattr(s, key, value)
    await db.commit()
    await db.refresh(s)
    async with _cache_lock:
        _cache = s
    return _to_dict(s)


async def get_cached(db: AsyncSession) -> SystemSettings:
    """Middleware uchun cached singleton — har 30s yangilanadi (oddiy)."""
    global _cache
    async with _cache_lock:
        if _cache is None:
            _cache = await ensure_settings(db)
    return _cache


async def invalidate_cache() -> None:
    global _cache
    async with _cache_lock:
        _cache = None
