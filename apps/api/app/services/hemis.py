"""HEMIS Excel import service.

Haqiqiy HEMIS exportidagi 18 ta ustunni parse qiladi.
"""

import io
import re
import secrets
import string
from datetime import date, datetime
from typing import Any

from loguru import logger
from openpyxl import load_workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.academic import AcademicYear, Direction, Group
from app.models.enums import DegreeType, EducationForm, Gender, StudentStatus, UserRole
from app.models.student import Student
from app.models.user import User
from app.schemas.hemis import HemisCredentials, HemisImportError, HemisImportResponse

# Header normalizatsiya: Unicode apostrofni ASCII'ga
_UNICODE_APOSTROPHES = {ord("‘"): "'", ord("’"): "'", ord("ʻ"): "'", ord("ʼ"): "'"}


def _normalize_header(s: str) -> str:
    return s.translate(_UNICODE_APOSTROPHES).strip().lower()


# Header (normalized) → canonical key
HEADER_MAP: dict[str, str] = {
    "talaba id": "hemis_id",
    "to'liq ismi": "full_name",
    "viloyat": "region",
    "tuman": "district",
    "jins": "gender",
    "tug'ilgan sana": "birth_date",
    "pasport raqami": "passport_number",
    "jshshir-kod": "jshshir",
    "jshshir": "jshshir",  # alt
    "kurs": "course",
    "fakultet": "faculty_name",  # info only — Direction orqali topamiz
    "guruh": "group_name",
    "ta'lim tili": "education_language",
    "o'quv yili": "academic_year_name",
    "semestr": "semester",
    "bitiruvchi": "is_graduating",
    "mutaxassislik": "direction_code",
    "ta'lim turi": "degree_type",
    "ta'lim shakli": "education_form",
}

REQUIRED_KEYS = {"hemis_id", "full_name", "direction_code", "group_name", "course"}


def _generate_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _parse_full_name(full: str) -> tuple[str, str, str | None]:
    """'ALIYEVA SHAXZODA AXTAM QIZI' → ('ALIYEVA', 'SHAXZODA', 'AXTAM QIZI')"""
    parts = full.strip().split()
    if len(parts) < 2:
        raise ValueError(f"Ism kamida 2 so'z bo'lishi kerak: {full!r}")
    last_name = parts[0]
    first_name = parts[1]
    middle_name = " ".join(parts[2:]) if len(parts) > 2 else None
    return last_name, first_name, middle_name


def _parse_course(v: Any) -> int:
    if v is None:
        raise ValueError("kurs bo'sh")
    s = str(v).strip()
    m = re.match(r"(\d+)", s)  # "3-kurs" → 3
    if not m:
        raise ValueError(f"kurs noto'g'ri: {v!r}")
    c = int(m.group(1))
    if not (1 <= c <= 4):
        raise ValueError(f"kurs 1-4 bo'lishi kerak: {c}")
    return c


def _parse_semester(v: Any) -> int | None:
    if v is None:
        return None
    s = str(v).strip()
    m = re.match(r"(\d+)", s)  # "5-semestr" → 5
    return int(m.group(1)) if m else None


def _parse_gender(v: Any) -> Gender | None:
    if v is None:
        return None
    s = str(v).strip().lower()
    if s in {"erkak", "er", "male", "m", "o'g'il"}:
        return Gender.MALE
    if s in {"ayol", "female", "f", "qiz"}:
        return Gender.FEMALE
    return None


def _parse_education_form(v: Any) -> EducationForm | None:
    if v is None:
        return None
    s = str(v).strip().lower()
    mapping = {
        "kunduzgi": EducationForm.DAYTIME,
        "kechki": EducationForm.EVENING,
        "sirtqi": EducationForm.CORRESPONDENCE,
        "masofaviy": EducationForm.DISTANCE,
    }
    return mapping.get(s)


def _parse_degree_type(v: Any) -> DegreeType | None:
    if v is None:
        return None
    s = str(v).strip().lower()
    if "bakalavr" in s:
        return DegreeType.BACHELOR
    if "magistr" in s:
        return DegreeType.MASTER
    if "phd" in s or "doktor" in s:
        return DegreeType.PHD
    return None


def _parse_bool(v: Any) -> bool:
    if v is None:
        return False
    s = str(v).strip().lower()
    return s in {"ha", "yes", "true", "1"}


def _parse_date(v: Any) -> date | None:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    s = str(v).strip()
    # ISO format "2004-12-21"
    try:
        return date.fromisoformat(s[:10])
    except ValueError:
        return None


def _parse_excel(
    file_bytes: bytes,
) -> tuple[list[dict[str, Any]], list[HemisImportError]]:
    errors: list[HemisImportError] = []
    rows: list[dict[str, Any]] = []

    try:
        wb = load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    except Exception as e:
        errors.append(HemisImportError(row=0, message=f"Excel ochib bo'lmadi: {e}"))
        return rows, errors

    ws = wb.active
    if ws is None:
        errors.append(HemisImportError(row=0, message="Excel bo'sh"))
        return rows, errors

    iterator = ws.iter_rows(values_only=True)
    header_row = next(iterator, None)
    if not header_row:
        errors.append(HemisImportError(row=1, message="Header yo'q"))
        return rows, errors

    # Headerlarni normalize qilib kanonik kalitga map qilamiz
    col_to_key: dict[int, str] = {}
    for idx, cell in enumerate(header_row):
        if cell is None:
            continue
        norm = _normalize_header(str(cell))
        if norm in HEADER_MAP:
            col_to_key[idx] = HEADER_MAP[norm]

    mapped_keys = set(col_to_key.values())
    missing = REQUIRED_KEYS - mapped_keys
    if missing:
        errors.append(
            HemisImportError(
                row=1,
                message=f"Majburiy ustunlar yetmaydi: {', '.join(sorted(missing))}",
            )
        )
        return rows, errors

    for row_idx, row in enumerate(iterator, start=2):
        if all(c is None or (isinstance(c, str) and not c.strip()) for c in row):
            continue

        rec: dict[str, Any] = {"_row_idx": row_idx}
        for col_idx, key in col_to_key.items():
            val = row[col_idx] if col_idx < len(row) else None
            if isinstance(val, str):
                val = val.strip() or None
            rec[key] = val
        rows.append(rec)

    return rows, errors


async def import_students(db: AsyncSession, file_bytes: bytes) -> HemisImportResponse:
    rows, parse_errors = _parse_excel(file_bytes)
    if parse_errors:
        return HemisImportResponse(
            total_rows=0, created=0, skipped=0, errors=parse_errors, credentials=[]
        )

    ay = (
        await db.execute(select(AcademicYear).where(AcademicYear.is_active.is_(True)))
    ).scalar_one_or_none()
    if not ay:
        return HemisImportResponse(
            total_rows=len(rows),
            created=0,
            skipped=0,
            errors=[HemisImportError(row=0, message="Aktiv akademik yil topilmadi")],
            credentials=[],
        )

    direction_cache: dict[str, Direction | None] = {}
    group_cache: dict[tuple[str, int, str], Group] = {}

    errors: list[HemisImportError] = []
    credentials: list[HemisCredentials] = []
    created = 0
    skipped = 0

    for rec in rows:
        row_idx = rec["_row_idx"]
        hemis_id = rec.get("hemis_id")

        try:
            if not hemis_id:
                raise ValueError("Talaba ID bo'sh")
            hemis_id = str(hemis_id).strip()

            # Dublikat
            if (
                await db.execute(select(Student).where(Student.hemis_id == hemis_id))
            ).scalar_one_or_none():
                skipped += 1
                continue

            # Direction — Mutaxassislik kodi bo'yicha
            direction_code = str(rec.get("direction_code", "")).strip()
            if direction_code not in direction_cache:
                d = (
                    await db.execute(select(Direction).where(Direction.code == direction_code))
                ).scalar_one_or_none()
                direction_cache[direction_code] = d
            direction = direction_cache[direction_code]
            if not direction:
                raise ValueError(f"Yo'nalish topilmadi: {direction_code}")

            course = _parse_course(rec.get("course"))

            # Group — yo'q bo'lsa avto-yaratamiz
            group_name = str(rec.get("group_name", "")).strip()
            if not group_name:
                raise ValueError("Guruh nomi bo'sh")

            cache_key = (str(direction.id), course, group_name)
            if cache_key not in group_cache:
                g = (
                    await db.execute(
                        select(Group).where(
                            Group.direction_id == direction.id,
                            Group.academic_year_id == ay.id,
                            Group.name == group_name,
                        )
                    )
                ).scalar_one_or_none()
                if not g:
                    g = Group(
                        direction_id=direction.id,
                        academic_year_id=ay.id,
                        name=group_name,
                        course=course,
                    )
                    db.add(g)
                    await db.flush()
                    logger.info(f"👥 Guruh avto-yaratildi: {group_name} (kurs {course})")
                group_cache[cache_key] = g
            group = group_cache[cache_key]

            # Ism parse
            full_name_raw = str(rec.get("full_name", "")).strip()
            if not full_name_raw:
                raise ValueError("To'liq ismi bo'sh")
            last_name, first_name, middle_name = _parse_full_name(full_name_raw)

            # Parol — pasport seriyasi (AB1234567). Pasport yo'q bo'lsa avto-generatsiya.
            passport_for_password = str(rec.get("passport_number") or "").strip()
            if passport_for_password:
                password = passport_for_password
            else:
                password = _generate_password()

            user = User(
                username=hemis_id,
                password_hash=hash_password(password),
                role=UserRole.STUDENT,
                is_active=True,
                first_name=first_name,
                last_name=last_name,
                middle_name=middle_name,
            )
            db.add(user)
            await db.flush()

            student = Student(
                user_id=user.id,
                hemis_id=hemis_id,
                gender=_parse_gender(rec.get("gender")),
                birth_date=_parse_date(rec.get("birth_date")),
                jshshir=rec.get("jshshir") or None,
                passport_number=rec.get("passport_number") or None,
                region=rec.get("region") or None,
                district=rec.get("district") or None,
                group_id=group.id,
                current_semester=_parse_semester(rec.get("semester")),
                is_graduating=_parse_bool(rec.get("is_graduating")),
                education_language=rec.get("education_language") or None,
                education_form=_parse_education_form(rec.get("education_form")),
                degree_type=_parse_degree_type(rec.get("degree_type")),
                status=StudentStatus.STUDYING,
            )
            db.add(student)
            await db.flush()

            credentials.append(
                HemisCredentials(
                    hemis_id=hemis_id,
                    full_name=full_name_raw,
                    username=hemis_id,
                    password=password,
                )
            )
            created += 1

        except Exception as e:  # noqa: BLE001
            errors.append(
                HemisImportError(
                    row=row_idx,
                    hemis_id=str(hemis_id) if hemis_id else None,
                    message=str(e),
                )
            )
            # Rollback va kesh'ni qayta yuklash
            await db.rollback()
            direction_cache.clear()
            group_cache.clear()
            ay = (
                await db.execute(select(AcademicYear).where(AcademicYear.is_active.is_(True)))
            ).scalar_one()
            continue

    await db.commit()

    return HemisImportResponse(
        total_rows=len(rows),
        created=created,
        skipped=skipped,
        errors=errors,
        credentials=credentials,
    )
