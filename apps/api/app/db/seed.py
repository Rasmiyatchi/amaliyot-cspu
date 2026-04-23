"""DB seed — startup'da super admin va (dev'da) sample academic data yaratadi."""

from datetime import date

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.academic import AcademicYear, Direction, Faculty, Group
from app.models.enums import UserRole
from app.models.user import User

# Sample data — 4+2 sillabusidan olingan real yo'nalishlar
SAMPLE_FACULTIES: list[dict[str, str]] = [
    {"name": "Pedagogika va boshlang'ich ta'lim fakulteti", "code": "PBT"},
    {"name": "Tabiiy fanlar fakulteti", "code": "TF"},
]

SAMPLE_DIRECTIONS: list[dict[str, str]] = [
    {"faculty_code": "PBT", "code": "60110100", "name": "Pedagogika"},
    {"faculty_code": "PBT", "code": "60110500", "name": "Boshlang'ich ta'lim"},
    {"faculty_code": "PBT", "code": "60110400", "name": "O'zbek tili va adabiyoti"},
    {"faculty_code": "TF", "code": "60110900", "name": "Biologiya"},
    {
        "faculty_code": "TF",
        "code": "60111000",
        "name": "Geografiya va iqtisodiy bilim asoslari",
    },
    {"faculty_code": "TF", "code": "60110800", "name": "Kimyo"},
    {"faculty_code": "TF", "code": "60110700", "name": "Fizika va astronomiya"},
]

SAMPLE_GROUPS: list[dict[str, str | int]] = [
    {"direction_code": "60110100", "name": "2301-01", "course": 3},
    {"direction_code": "60110500", "name": "2301-02", "course": 3},
    {"direction_code": "60110900", "name": "2401-01", "course": 2},
]


async def ensure_super_admin(db: AsyncSession) -> None:
    existing = (
        await db.execute(select(User).where(User.role == UserRole.SUPER_ADMIN).limit(1))
    ).scalar_one_or_none()
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


async def _ensure_academic_year(db: AsyncSession) -> AcademicYear:
    ay = (
        await db.execute(select(AcademicYear).where(AcademicYear.name == "2025-2026"))
    ).scalar_one_or_none()
    if ay:
        return ay
    ay = AcademicYear(
        name="2025-2026",
        start_date=date(2025, 9, 1),
        end_date=date(2026, 8, 31),
        is_active=True,
    )
    db.add(ay)
    await db.flush()
    logger.info(f"📅 AcademicYear yaratildi: {ay.name}")
    return ay


async def _ensure_faculties(db: AsyncSession) -> dict[str, Faculty]:
    out: dict[str, Faculty] = {}
    for data in SAMPLE_FACULTIES:
        existing = (
            await db.execute(select(Faculty).where(Faculty.code == data["code"]))
        ).scalar_one_or_none()
        if existing:
            out[data["code"]] = existing
            continue
        f = Faculty(name=data["name"], code=data["code"])
        db.add(f)
        await db.flush()
        logger.info(f"🏛 Faculty yaratildi: {f.code} — {f.name}")
        out[data["code"]] = f
    return out


async def _ensure_directions(
    db: AsyncSession, faculty_by_code: dict[str, Faculty]
) -> dict[str, Direction]:
    out: dict[str, Direction] = {}
    for data in SAMPLE_DIRECTIONS:
        existing = (
            await db.execute(select(Direction).where(Direction.code == data["code"]))
        ).scalar_one_or_none()
        if existing:
            out[data["code"]] = existing
            continue
        faculty = faculty_by_code[data["faculty_code"]]
        d = Direction(faculty_id=faculty.id, code=data["code"], name=data["name"])
        db.add(d)
        await db.flush()
        logger.info(f"🎓 Direction yaratildi: {d.code} — {d.name}")
        out[data["code"]] = d
    return out


async def _ensure_groups(
    db: AsyncSession,
    ay: AcademicYear,
    direction_by_code: dict[str, Direction],
) -> None:
    for data in SAMPLE_GROUPS:
        direction = direction_by_code[str(data["direction_code"])]
        name = str(data["name"])
        existing = (
            await db.execute(
                select(Group).where(
                    Group.direction_id == direction.id,
                    Group.academic_year_id == ay.id,
                    Group.name == name,
                )
            )
        ).scalar_one_or_none()
        if existing:
            continue
        g = Group(
            direction_id=direction.id,
            academic_year_id=ay.id,
            name=name,
            course=int(data["course"]),
        )
        db.add(g)
        logger.info(f"👥 Group yaratildi: {g.name} (course={g.course})")


async def ensure_sample_academic(db: AsyncSession) -> None:
    """Dev-only: sample fakultet/yo'nalish/guruh."""
    ay = await _ensure_academic_year(db)
    faculties = await _ensure_faculties(db)
    directions = await _ensure_directions(db, faculties)
    await _ensure_groups(db, ay, directions)
    await db.commit()


async def run_seeds() -> None:
    from app.db.seed_practice_types import ensure_practice_types

    async with SessionLocal() as db:
        await ensure_super_admin(db)
        await ensure_practice_types(db)  # barcha muhit — reference data
        if settings.APP_ENV == "development":
            await ensure_sample_academic(db)
