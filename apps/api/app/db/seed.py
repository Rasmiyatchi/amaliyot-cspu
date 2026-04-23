"""DB seed — startup'da super admin bo'lmasa, `.env` dan yaratadi."""

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.enums import UserRole
from app.models.user import User


async def ensure_super_admin(db: AsyncSession) -> None:
    """Agar super_admin mavjud bo'lmasa, settings'dan yaratadi."""
    stmt = select(User).where(User.role == UserRole.SUPER_ADMIN).limit(1)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        logger.debug(f"Super admin mavjud: {existing.username}")
        return

    user = User(
        username=settings.SUPERADMIN_USERNAME,
        email=settings.SUPERADMIN_EMAIL,
        password_hash=hash_password(settings.SUPERADMIN_PASSWORD),
        role=UserRole.SUPER_ADMIN,
        is_active=True,
        first_name="Super",
        last_name="Admin",
    )
    db.add(user)
    await db.commit()
    logger.success(f"🔑 Super admin yaratildi: {user.username}")


async def run_seeds() -> None:
    """Barcha seed'larni ketma-ket bajaradi."""
    async with SessionLocal() as db:
        await ensure_super_admin(db)
