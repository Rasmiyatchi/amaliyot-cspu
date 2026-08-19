"""Data Cleaner Service — Baza ma'lumotlarini 0 dan tozalash va tizimni qayta tiklash."""

from pathlib import Path
from loguru import logger
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.db.seed import ensure_sample_academic
from app.db.seed_practice_types import ensure_practice_types
from app.db.seed_task_templates import ensure_task_templates
from app.models.enums import UserRole
from app.models.user import User
from app.models.system_settings import SystemSettings

TABLES_TO_TRUNCATE = [
    "attendance_overrides",
    "attendance_events",
    "attendance_days",
    "journal_entries",
    "lesson_analyses",
    "tasks",
    "final_reports",
    "documents",
    "inquiry_messages",
    "inquiries",
    "notifications",
    "audit_logs",
    "refresh_tokens",
    "contracts",
    "practice_applications",
    "practice_assignments",
    "supervisor_organizations",
    "supervisors",
    "students",
    "organizations",
    "areas",
    "groups",
    "departments",
    "directions",
    "faculties",
    "academic_years",
]


async def reset_all_data(db: AsyncSession) -> dict[str, int]:
    """Test va dinamik ma'lumotlarni tozalab, tizimni 0 holatiga qaytaradi."""
    logger.info("🧹 Ma'lumotlar bazasini tozalash boshlandi...")

    # 1. Truncate dynamic tables
    for table in TABLES_TO_TRUNCATE:
        try:
            await db.execute(text(f'TRUNCATE TABLE "{table}" CASCADE;'))
        except Exception as e:
            logger.warning(f"  ⚠ {table} truncate xatosi (DELETE): {e}")
            await db.execute(text(f'DELETE FROM "{table}";'))

    # 2. Delete non-superadmin users
    await db.execute(text("DELETE FROM users WHERE role != 'super_admin';"))

    # 3. Ensure superadmin exists with configured credentials
    super_admin = (
        await db.execute(select(User).where(User.role == UserRole.SUPER_ADMIN).limit(1))
    ).scalar_one_or_none()

    if super_admin:
        super_admin.username = settings.SUPERADMIN_USERNAME
        super_admin.email = settings.SUPERADMIN_EMAIL
        super_admin.password_hash = hash_password(settings.SUPERADMIN_PASSWORD)
        super_admin.is_active = True
        super_admin.first_name = "Super"
        super_admin.last_name = "Admin"
    else:
        super_admin = User(
            username=settings.SUPERADMIN_USERNAME,
            email=settings.SUPERADMIN_EMAIL,
            password_hash=hash_password(settings.SUPERADMIN_PASSWORD),
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            first_name="Super",
            last_name="Admin",
        )
        db.add(super_admin)

    # 4. Ensure SystemSettings exists and reset maintenance mode
    settings_row = (await db.execute(select(SystemSettings).limit(1))).scalar_one_or_none()
    if not settings_row:
        settings_row = SystemSettings(
            site_name="CHDPU Amaliyot Platformasi",
            max_file_size_mb=10,
            allowed_file_types=["pdf", "jpg", "jpeg", "png", "doc", "docx"],
            email_notifications_enabled=True,
            maintenance_mode=False,
        )
        db.add(settings_row)
    else:
        settings_row.maintenance_mode = False

    await db.commit()

    # 5. Reseed reference data
    await ensure_practice_types(db)
    await ensure_task_templates(db)
    await ensure_sample_academic(db)

    # 6. Ensure active status for contract templates
    await db.execute(text("UPDATE contract_templates SET status = 'active';"))
    await db.commit()

    # 7. Clean physical storage files (contracts and uploads)
    storage_root = Path(__file__).parent.parent.parent / "storage"
    if storage_root.exists():
        for sub in ["contracts", "uploads"]:
            folder = storage_root / sub
            if folder.exists():
                for f in folder.glob("*"):
                    if f.is_file():
                        try:
                            f.unlink()
                        except Exception as e:
                            logger.warning(f"Storage clean error for {f.name}: {e}")

    # 8. Collect final table counts
    counts: dict[str, int] = {}
    tables_res = await db.execute(
        text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
    )
    for row in tables_res.fetchall():
        t_name = row[0]
        if t_name == "alembic_version":
            continue
        cnt = (await db.execute(text(f'SELECT COUNT(*) FROM "{t_name}"'))).scalar() or 0
        counts[t_name] = cnt

    logger.success("✨ Baza muvaffaqiyatli tozalandi!")
    return counts
