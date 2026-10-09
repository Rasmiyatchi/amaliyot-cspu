"""Data Cleaner — sinov ma'lumotlarini tozalab, tizimni boshlang'ich holatga qaytarish.

FAQAT CLI orqali ishga tushiriladi (`scripts/clean_and_reset_data.py`) — HTTP endpoint YO'Q:
bitta POST so'rov bilan production bazasini o'chirib yuborish imkoniyati bo'lmasligi kerak.

Xavfsizlik qoidalari:
- production muhitida faqat `ALLOW_DATABASE_RESET=1` muhit o'zgaruvchisi bilan ishlaydi;
- `TRUNCATE ... CASCADE` ishlatilmaydi: u `users.faculty_id` orqali BUTUN `users` jadvalini va
  undan `contract_templates`, `documents` va boshqalarni ham o'chirib yuborardi. O'rniga bog'liqlik
  tartibida `DELETE` qilinadi;
- super admin(lar) va ularning paroli saqlanadi; audit jurnali saqlanadi (tozalash ham yoziladi);
- shartnoma shablonlari saqlanadi va ularning statusi o'zgartirilmaydi.
"""

import os
from pathlib import Path

from loguru import logger
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.db.seed import ensure_sample_academic
from app.db.seed_practice_types import ensure_practice_types
from app.db.seed_task_templates import ensure_task_templates
from app.models.audit_log import AuditLog
from app.models.enums import UserRole
from app.models.system_settings import SystemSettings
from app.models.user import User

# Bog'liqlik tartibida (avval bolalar) — har biri oddiy DELETE
TABLES_IN_DELETE_ORDER = [
    "attendance_overrides",
    "attendance_events",
    "attendance_days",
    "journal_entries",
    "lesson_analyses",
    "tasks",
    "final_reports",
    "inquiry_messages",
    "inquiries",
    "notifications",
    "broadcasts",
    "contracts",
    "practice_applications",
    "practice_assignments",
    "supervisor_organizations",
    "supervisors",
    "students",
    "documents",
    "organizations",
    "areas",
    "groups",
    "departments",
    "directions",
    "faculties",
    "academic_years",
]


class ResetNotAllowedError(RuntimeError):
    """Production muhitida ruxsatsiz tozalashga urinish."""


def reset_allowed() -> bool:
    return settings.APP_ENV != "production" or os.environ.get("ALLOW_DATABASE_RESET") == "1"


def _remove_storage_files() -> None:
    storage_root = Path(__file__).resolve().parent.parent.parent / "storage"
    for sub in ("contracts", "uploads"):
        folder = storage_root / sub
        if not folder.exists():
            continue
        for f in folder.rglob("*"):
            if f.is_file():
                try:
                    f.unlink()
                except OSError as e:
                    logger.warning(f"Faylni o'chirib bo'lmadi ({f}): {e}")


async def reset_all_data(db: AsyncSession) -> dict[str, int]:
    """Dinamik ma'lumotlarni o'chiradi; super admin, shablonlar va audit jurnali saqlanadi."""
    if not reset_allowed():
        raise ResetNotAllowedError(
            "Production muhitida bazani tozalash taqiqlangan "
            "(ataylab kerak bo'lsa ALLOW_DATABASE_RESET=1 bilan ishga tushiring)"
        )

    logger.warning("🧹 Ma'lumotlar bazasini tozalash boshlandi...")
    deleted: dict[str, int] = {}

    for table in TABLES_IN_DELETE_ORDER:
        # Jadval nomi faqat yuqoridagi doimiy ro'yxatdan olinadi
        result = await db.execute(text(f'DELETE FROM "{table}"'))  # noqa: S608
        deleted[table] = int(getattr(result, "rowcount", 0) or 0)

    # Super admin'dan boshqa barcha foydalanuvchilar (talaba/supervizor/admin)
    result = await db.execute(text("DELETE FROM users WHERE role <> 'super_admin'"))
    deleted["users"] = int(getattr(result, "rowcount", 0) or 0)

    # Super admin bo'lmasa — .env dagi ma'lumotlar bilan yaratiladi (mavjudlariga TEGILMAYDI)
    has_super_admin = (
        await db.execute(select(User.id).where(User.role == UserRole.SUPER_ADMIN).limit(1))
    ).scalar_one_or_none()
    if has_super_admin is None:
        db.add(
            User(
                username=settings.SUPERADMIN_USERNAME,
                email=settings.SUPERADMIN_EMAIL,
                password_hash=hash_password(settings.SUPERADMIN_PASSWORD),
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                must_change_password=True,
                first_name="Super",
                last_name="Admin",
            )
        )

    settings_row = (await db.execute(select(SystemSettings).limit(1))).scalar_one_or_none()
    if settings_row is not None:
        settings_row.maintenance_mode = False

    db.add(
        AuditLog(
            actor_user_id=None,
            actor_role="system",
            actor_name="CLI: clean_and_reset_data",
            action="delete",
            entity_type="database",
            entity_id=None,
            summary="Baza sinov ma'lumotlaridan tozalandi",
            metadata_json={"deleted": deleted},
        )
    )
    await db.commit()

    # Ma'lumotnoma ma'lumotlar (idempotent)
    await ensure_practice_types(db)
    await ensure_task_templates(db)
    if settings.APP_ENV == "development":
        await ensure_sample_academic(db)
    await db.commit()

    # Shartnoma PDF/skanlari va yuklangan fayllar (bazadagi yozuvlari o'chirildi)
    _remove_storage_files()

    logger.success(f"✨ Baza tozalandi: {deleted}")
    return deleted
