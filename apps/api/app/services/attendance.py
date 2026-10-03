"""Attendance service — check-in/out, geo-fence, approve/reject, override, to'liq boshqaruv.

Biznes mantiq:
- check_in: agar shu kunda AttendanceDay bo'lmasa — yaratiladi (status=PENDING).
  Keyin bosilsa — yangi event, lekin kun bir marta. Oldindan YASHIL qilingan kun yashil qoladi.
- check_out: shu kundagi mavjud AttendanceDay'ga qo'shiladi (6 soat qoidasi).
- admin_approve / admin_reject: PENDING → GREEN / RED (super admin).
- admin_mark_red: kun o'tgan, check-in yo'q → RED.
- super_admin_override: istalgan status → istalgan status, sabab majburiy, audit yoziladi.
- super_admin_set_day: kunni to'liq tahrirlash (status + vaqtlar + izoh), kun bo'lmasa yaratiladi
  (kelajakdagi kunni oldindan yashil qilish shu orqali).
- super_admin_set_range / bulk_set_range: sana oralig'ini (oyni) bir/ko'p talaba uchun belgilash.
- summary: talaba-markazli jamlanma (kutilgan/yashil/qizil/kutilmoqda/foiz).
- sync_missed_attendance_days: o'tib ketgan kunlarni avto-qizil qilish — set-based SQL,
  race-safe (ON CONFLICT DO NOTHING), global variant throttle bilan.
"""

from __future__ import annotations

import math
import re
from datetime import UTC, date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import Select, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.academic import Direction, Faculty, Group
from app.models.area import Area
from app.models.attendance import AttendanceDay, AttendanceEvent, AttendanceOverride
from app.models.enums import (
    AssignmentStatus,
    AttendanceDayStatus,
    AttendanceEventKind,
    NotificationType,
    UserRole,
)
from app.models.organization import Organization
from app.models.practice_assignment import PracticeAssignment
from app.models.practice_type import PracticeType
from app.models.student import Student
from app.models.supervisor import Supervisor
from app.models.user import User
from app.services import notification as notification_svc
from app.services.attendance_stats import compute_percent, expected_days
from app.services.search_utils import like_pattern, normalized_col

MIN_PRACTICE_SECONDS = 6 * 3600  # 6 soat = 21600 soniya
UZB_TZ = timezone(timedelta(hours=5))
DEFAULT_WORK_WEEKDAYS: frozenset[int] = frozenset({1, 2, 3, 4, 5, 6})  # Du–Sha (ISO)

NOTE_PENDING_EXPIRED = "Kun davomida to'liq davomat (kelish/ketish) yakunlanmadi"
NOTE_MISSING_DAY = "Amaliyotga kelinmadi (qolib ketgan kun)"

# Kech kelgan talaba (masalan 18:30) 6 soatdan keyin yarim tundan o'tib ketishni qayd etadi —
# ochiq smena shu muddatgacha "kecha" kuniga yoziladi va avto-qizilga aylantirilmaydi.
OPEN_SHIFT_MAX = timedelta(hours=20)
# GPS aniqligi (±m) hisobiga radiusga qo'shiladigan maksimal yengillik
GEO_ACCURACY_ALLOWANCE_MAX_M = 150.0

# Global (barcha biriktirishlar) sinxronizatsiya — har so'rovda emas, kamida shu oraliqda bir marta
_GLOBAL_SYNC_INTERVAL = timedelta(seconds=90)
_last_global_sync: datetime | None = None


def today_uzb() -> date:
    return datetime.now(UZB_TZ).date()


# ─── Geo-fence ────────────────────────────────────────────


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Ikki nuqta orasidagi masofa (metrda)."""
    r = 6371000.0  # Yer radiusi (m)
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _evaluate_geo(
    *,
    lat: float | None,
    lng: float | None,
    accuracy_m: float | None,
    wifi_ssid: str | None,
    organization: Organization | None,
) -> tuple[float | None, bool]:
    """Geo-fence tekshirish.

    Qaytaradi: (distance_m, is_within_fence).
    - Hudud (area) amaliyoti yoki tashkilot nuqtasi kiritilmagan → tekshirilmaydi (within=True).
    - Koordinata kelmasa → within=False, distance=None (chaqiruvchi alohida xabar beradi).
    - Radiusga GPS aniqligi (±m) qo'shiladi, lekin ko'pi bilan GEO_ACCURACY_ALLOWANCE_MAX_M:
      bino ichida arzon telefonlar 80–150 m aniqlik beradi, eski 50 m chegara sabab ko'p talaba
      bino ichida turib "tashqaridasiz" xatosini olardi.
    - `wifi_ssid` faqat ma'lumot uchun saqlanadi: brauzer Wi-Fi nomini o'qiy olmaydi, uni klient
      o'zi yozib yuboradi — unga ishonib geo-fence'ni chetlab o'tish mumkin edi.
    """
    del wifi_ssid
    if organization is None:
        return None, True

    if organization.geo_lat is None or organization.geo_lng is None:
        return None, True

    if lat is None or lng is None:
        return None, False

    distance = haversine_m(
        float(organization.geo_lat),
        float(organization.geo_lng),
        float(lat),
        float(lng),
    )
    radius = float(organization.geo_radius_m or 100)
    allowance = min(float(accuracy_m or 0), GEO_ACCURACY_ALLOWANCE_MAX_M)
    return distance, distance <= radius + allowance


def _raise_outside_fence(
    distance: float | None, organization: Organization | None, accuracy_m: float | None
) -> None:
    if distance is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Joylashuv (GPS) ma'lumoti kelmadi. Telefonda joylashuvni yoqing va brauzerga "
            "ruxsat bering, so'ng qayta urinib ko'ring.",
        )
    radius = int((organization.geo_radius_m if organization else None) or 100)
    accuracy = f" (GPS aniqligi ±{int(accuracy_m)} m)" if accuracy_m else ""
    raise HTTPException(
        status.HTTP_400_BAD_REQUEST,
        f"Tashkilot hududidan tashqaridasiz: masofa {distance:.0f} m, ruxsat etilgan radius "
        f"{radius} m{accuracy}. Binoga yaqinroq borib qayta urinib ko'ring.",
    )


# ─── Helpers ─────────────────────────────────────────────


async def _get_assignment_for_student(
    db: AsyncSession, assignment_id: UUID, student_user_id: UUID
) -> PracticeAssignment:
    """Biriktirishni yuklaydi va talabaga tegishli ekanligini tekshiradi."""
    stmt = (
        select(PracticeAssignment)
        .join(Student, Student.id == PracticeAssignment.student_id)
        .where(
            PracticeAssignment.id == assignment_id,
            Student.user_id == student_user_id,
        )
    )
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    if not assignment:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Biriktirish topilmadi yoki sizga tegishli emas",
        )
    return assignment


async def _get_assignment_for_supervisor(
    db: AsyncSession, assignment_id: UUID, supervisor_user_id: UUID
) -> PracticeAssignment:
    """Biriktirish supervizorga tegishli bo'lishini tekshiradi."""
    stmt = (
        select(PracticeAssignment)
        .join(Supervisor, Supervisor.id == PracticeAssignment.supervisor_id)
        .where(
            PracticeAssignment.id == assignment_id,
            Supervisor.user_id == supervisor_user_id,
        )
    )
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    if not assignment:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Biriktirish topilmadi yoki siz supervizor emassiz",
        )
    return assignment


async def _student_user_id_for_assignment(db: AsyncSession, assignment_id: UUID) -> UUID | None:
    stmt = (
        select(Student.user_id)
        .join(PracticeAssignment, PracticeAssignment.student_id == Student.id)
        .where(PracticeAssignment.id == assignment_id)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def _get_or_create_day(db: AsyncSession, assignment_id: UUID, day: date) -> AttendanceDay:
    stmt = select(AttendanceDay).where(
        AttendanceDay.assignment_id == assignment_id,
        AttendanceDay.date == day,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        return existing

    attendance_day = AttendanceDay(
        id=uuid4(),
        assignment_id=assignment_id,
        date=day,
        status=AttendanceDayStatus.PENDING,
    )
    db.add(attendance_day)
    await db.flush()
    return attendance_day


def _verify_day_in_range(assignment: PracticeAssignment, day: date) -> None:
    if day < assignment.start_date or day > assignment.end_date:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Sana amaliyot diapazonidan tashqarida "
            f"({assignment.start_date} – {assignment.end_date})",
        )


def _verify_assignment_open(assignment: PracticeAssignment) -> None:
    if assignment.status == AssignmentStatus.CANCELLED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Biriktirish bekor qilingan")
    if assignment.status == AssignmentStatus.COMPLETED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Amaliyot yakunlangan")


def required_weekday_set(assignment: PracticeAssignment) -> frozenset[int]:
    if assignment.required_weekdays:
        return frozenset(assignment.required_weekdays)
    return DEFAULT_WORK_WEEKDAYS


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def _escape_like(term: str) -> str:
    return re.sub(r"([%_\\])", r"\\\1", term)


def _search_clause(term: str) -> Any:
    """Ism-familiya (apostroflar farqsiz), HEMIS ID yoki login bo'yicha."""
    raw = f"%{_escape_like(term.strip())}%"
    pattern = like_pattern(term)
    return or_(
        normalized_col(
            func.concat(
                User.last_name, " ", User.first_name, " ", func.coalesce(User.middle_name, "")
            )
        ).like(pattern, escape="\\"),
        normalized_col(func.concat(User.first_name, " ", User.last_name)).like(
            pattern, escape="\\"
        ),
        Student.hemis_id.ilike(raw, escape="\\"),
        User.username.ilike(raw, escape="\\"),
    )


# ─── Missed Days Sync (Auto Red) ─────────────────────────

_SQL_EXPIRE_PENDING = """
UPDATE attendance_days AS d
SET status = 'red',
    note = COALESCE(d.note, :note_pending),
    updated_at = now()
FROM practice_assignments a
WHERE a.id = d.assignment_id
  AND d.status = 'pending'
  AND d.date <= CAST(:yesterday AS date)
  AND NOT (
    d.check_in_at IS NOT NULL AND d.check_out_at IS NULL
    AND d.check_in_at > now() - CAST(:open_shift AS interval)
  )
  {scope}
"""

# Yo'q kunlarni RED sifatida yaratish. generate_series har bir biriktirish uchun
# [start_date, min(end_date, yesterday)] oralig'ini beradi; faqat majburiy hafta kunlari
# (yoki Du–Sha) olinadi. UNIQUE (assignment_id, date) to'qnashuvi jim o'tkaziladi —
# parallel so'rovlar bir-birini buzmaydi.
_SQL_INSERT_MISSING = """
INSERT INTO attendance_days (id, assignment_id, date, status, note, created_at, updated_at)
SELECT gen_random_uuid(), a.id, CAST(gs.d AS date), 'red', :note_missing, now(), now()
FROM practice_assignments a
CROSS JOIN LATERAL generate_series(
    CAST(a.start_date AS timestamp),
    CAST(LEAST(a.end_date, CAST(:yesterday AS date)) AS timestamp),
    interval '1 day'
) AS gs(d)
WHERE a.start_date <= CAST(:yesterday AS date)
  {scope}
  AND (
    (a.required_weekdays IS NOT NULL AND cardinality(a.required_weekdays) > 0
        AND CAST(EXTRACT(ISODOW FROM gs.d) AS int) = ANY(a.required_weekdays))
    OR ((a.required_weekdays IS NULL OR cardinality(a.required_weekdays) = 0)
        AND EXTRACT(ISODOW FROM gs.d) <= 6)
  )
ON CONFLICT ON CONSTRAINT uq_attendance_days_assignment_date DO NOTHING
"""


async def sync_missed_attendance_days(
    db: AsyncSession,
    *,
    assignment_id: UUID | None = None,
    student_id: UUID | None = None,
    force: bool = False,
) -> int:
    """O'tib ketgan / qolib ketgan kunlarni avtomatik RED qiladi.

    - PENDING qolib ketgan o'tgan kunlar → RED.
    - Umuman yozuvi bo'lmagan o'tgan majburiy ish kunlari → RED sifatida yaratiladi.

    Scope berilmasa (global) — faqat active/draft biriktirishlar va kamida
    `_GLOBAL_SYNC_INTERVAL` oralig'ida bir marta (har GET so'rovda og'ir ish bo'lmasin).
    O'zgargan/yaratilgan qatorlar sonini qaytaradi.
    """
    global _last_global_sync  # noqa: PLW0603

    scoped = assignment_id is not None or student_id is not None
    now = datetime.now(UTC)
    if not scoped and not force:
        if _last_global_sync is not None and now - _last_global_sync < _GLOBAL_SYNC_INTERVAL:
            return 0
        _last_global_sync = now

    yesterday = today_uzb() - timedelta(days=1)
    params: dict[str, Any] = {
        "yesterday": yesterday,
        "note_pending": NOTE_PENDING_EXPIRED,
        "note_missing": NOTE_MISSING_DAY,
        "open_shift": OPEN_SHIFT_MAX,  # asyncpg interval uchun timedelta kutadi
    }
    # Bekor qilingan / yakunlangan biriktirishlarga yangi qizil kun YOZILMAYDI
    # (yakuniy baho hisoblangan, bekor qilingandan keyingi kunlar "kelmadi" emas).
    scope = "AND a.status IN ('active', 'draft')"
    if student_id is not None:
        scope += " AND a.student_id = :student_id"
        params["student_id"] = student_id
    elif assignment_id is not None:
        scope += " AND a.id = :assignment_id"
        params["assignment_id"] = assignment_id

    changed = 0
    expired = await db.execute(text(_SQL_EXPIRE_PENDING.format(scope=scope)), params)
    changed += max(int(getattr(expired, "rowcount", 0) or 0), 0)
    inserted = await db.execute(text(_SQL_INSERT_MISSING.format(scope=scope)), params)
    changed += max(int(getattr(inserted, "rowcount", 0) or 0), 0)

    if changed:
        await db.commit()
    return changed


# ─── Student actions ─────────────────────────────────────


async def student_check_in(
    db: AsyncSession,
    assignment_id: UUID,
    student_user_id: UUID,
    payload: BaseModel,
) -> dict[str, Any]:
    assignment = await _get_assignment_for_student(db, assignment_id, student_user_id)
    _verify_assignment_open(assignment)
    now = datetime.now(UTC)
    today = today_uzb()
    _verify_day_in_range(assignment, today)

    org_id = assignment.organization_id

    # O'tgan qolib ketgan kunlarni sinxronizatsiya qilish (faqat shu biriktirish)
    await sync_missed_attendance_days(db, assignment_id=assignment_id)

    organization = None
    if org_id:
        organization = await db.get(Organization, org_id)

    data = payload.model_dump()
    distance, within = _evaluate_geo(
        lat=data.get("lat"),
        lng=data.get("lng"),
        accuracy_m=data.get("accuracy_m"),
        wifi_ssid=data.get("wifi_ssid"),
        organization=organization,
    )
    if not within:
        _raise_outside_fence(distance, organization, data.get("accuracy_m"))

    attendance_day = await _get_or_create_day(db, assignment_id, today)
    if attendance_day.status == AttendanceDayStatus.RED:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Bugun qizil deb belgilangan — check-in mumkin emas",
        )

    event = AttendanceEvent(
        attendance_day_id=attendance_day.id,
        assignment_id=assignment_id,
        kind=AttendanceEventKind.CHECK_IN,
        event_at=now,
        lat=data.get("lat"),
        lng=data.get("lng"),
        accuracy_m=data.get("accuracy_m"),
        distance_m=distance,
        is_within_fence=within,
        wifi_ssid=data.get("wifi_ssid"),
        device_id=data.get("device_id"),
        note=data.get("note"),
    )
    db.add(event)

    # Birinchi kelish vaqti fiksatsiya qilinadi. Oldindan YASHIL qilingan kun (super admin)
    # yashil qoladi — talaba kelishi uni "kutilmoqda"ga tushirmaydi.
    if attendance_day.check_in_at is None:
        attendance_day.check_in_at = now

    await db.commit()
    return await get_day(db, attendance_day.id)


async def _find_open_day(
    db: AsyncSession, assignment_id: UUID, today: date, now: datetime
) -> AttendanceDay | None:
    """Ketish qayd etiladigan kun: bugungi ochiq kun, bo'lmasa — kechagi ochiq smena
    (kech kelib yarim tundan keyin ketayotgan talaba uchun), OPEN_SHIFT_MAX ichida."""
    rows = (
        (
            await db.execute(
                select(AttendanceDay)
                .where(
                    AttendanceDay.assignment_id == assignment_id,
                    AttendanceDay.date.in_([today, today - timedelta(days=1)]),
                    AttendanceDay.check_in_at.is_not(None),
                    AttendanceDay.check_out_at.is_(None),
                )
                .order_by(AttendanceDay.date.desc())
            )
        )
        .scalars()
        .all()
    )
    for day in rows:
        if day.date == today:
            return day
        if day.check_in_at is not None and now - _as_utc(day.check_in_at) <= OPEN_SHIFT_MAX:
            return day
    return None


async def student_check_out(
    db: AsyncSession,
    assignment_id: UUID,
    student_user_id: UUID,
    payload: BaseModel,
) -> dict[str, Any]:
    assignment = await _get_assignment_for_student(db, assignment_id, student_user_id)
    _verify_assignment_open(assignment)
    now = datetime.now(UTC)
    today = today_uzb()

    attendance_day = await _find_open_day(db, assignment_id, today, now)
    if attendance_day is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Bugun avval kelish (check-in) qayd etilmagan",
        )
    _verify_day_in_range(assignment, attendance_day.date)
    if attendance_day.status == AttendanceDayStatus.RED:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Bu kun qizil deb belgilangan — ketishni qayd etib bo'lmaydi",
        )

    # 6 soatlik majburiy amaliyot vaqti qoidasi
    check_in_time = _as_utc(attendance_day.check_in_at or now)
    elapsed_seconds = (now - check_in_time).total_seconds()
    if elapsed_seconds < MIN_PRACTICE_SECONDS:
        remaining_seconds = int(MIN_PRACTICE_SECONDS - elapsed_seconds)
        # Tilga bog'liq bo'lmagan format (rus tiliga katalog orqali o'giriladi)
        rem_minutes_total = max(1, -(-remaining_seconds // 60))
        rem_str = f"{rem_minutes_total // 60}:{rem_minutes_total % 60:02d}"
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Ketishni qayd etish uchun kamida 6 soat amaliyot o'tgan bo'lishi shart. "
            f"Qolgan vaqt: {rem_str} (soat:daqiqa)",
        )

    organization = None
    if assignment.organization_id:
        organization = await db.get(Organization, assignment.organization_id)

    data = payload.model_dump()
    distance, within = _evaluate_geo(
        lat=data.get("lat"),
        lng=data.get("lng"),
        accuracy_m=data.get("accuracy_m"),
        wifi_ssid=data.get("wifi_ssid"),
        organization=organization,
    )
    if not within:
        _raise_outside_fence(distance, organization, data.get("accuracy_m"))

    event = AttendanceEvent(
        attendance_day_id=attendance_day.id,
        assignment_id=assignment_id,
        kind=AttendanceEventKind.CHECK_OUT,
        event_at=now,
        lat=data.get("lat"),
        lng=data.get("lng"),
        accuracy_m=data.get("accuracy_m"),
        distance_m=distance,
        is_within_fence=within,
        wifi_ssid=data.get("wifi_ssid"),
        device_id=data.get("device_id"),
        note=data.get("note"),
    )
    db.add(event)
    attendance_day.check_out_at = now

    # Avtomatik ravishda Yashil (Green / Bajarilgan) holatga o'tadi
    attendance_day.status = AttendanceDayStatus.GREEN

    await db.commit()
    return await get_day(db, attendance_day.id)


# ─── Admin actions (Approve / Reject) ────────────────────


async def admin_approve(
    db: AsyncSession,
    day_id: UUID,
    admin_user_id: UUID,
    payload: BaseModel,
) -> dict[str, Any]:
    attendance_day = await db.get(AttendanceDay, day_id)
    if not attendance_day:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kun topilmadi")

    if attendance_day.status == AttendanceDayStatus.GREEN:
        raise HTTPException(status.HTTP_409_CONFLICT, "Allaqachon yashil")

    attendance_day.status = AttendanceDayStatus.GREEN
    attendance_day.approved_by_id = admin_user_id
    attendance_day.approved_at = datetime.now(UTC)
    data = payload.model_dump(exclude_unset=True)
    if data.get("note") is not None:
        attendance_day.note = data["note"]

    await db.commit()
    return await get_day(db, attendance_day.id)


async def admin_reject(
    db: AsyncSession,
    day_id: UUID,
    admin_user_id: UUID,
    payload: BaseModel,
) -> dict[str, Any]:
    attendance_day = await db.get(AttendanceDay, day_id)
    if not attendance_day:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kun topilmadi")

    data = payload.model_dump()
    attendance_day.status = AttendanceDayStatus.RED
    attendance_day.approved_by_id = admin_user_id
    attendance_day.approved_at = datetime.now(UTC)
    attendance_day.note = data["note"]

    student_uid = await _student_user_id_for_assignment(db, attendance_day.assignment_id)
    if student_uid:
        await notification_svc.create(
            db,
            user_id=student_uid,
            type=NotificationType.ATTENDANCE_REJECTED,
            title="Davomat rad etildi",
            body=f"{attendance_day.date}: {data['note']}",
            data={
                "assignment_id": str(attendance_day.assignment_id),
                "day_id": str(attendance_day.id),
            },
        )

    await db.commit()
    return await get_day(db, attendance_day.id)


# Orqaga moslik uchun aliaslar
supervisor_approve = admin_approve
supervisor_reject = admin_reject


# ─── Admin actions ──────────────────────────────────────


async def admin_mark_red(
    db: AsyncSession, assignment_id: UUID, payload: BaseModel
) -> dict[str, Any]:
    """Check-in qilmagan kunni qizilga belgilash."""
    assignment = await db.get(PracticeAssignment, assignment_id)
    if not assignment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Biriktirish topilmadi")

    data = payload.model_dump()
    day: date = data["date"]
    _verify_day_in_range(assignment, day)

    if day >= today_uzb():
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Faqat o'tgan kunlar uchun qizilga belgilash mumkin",
        )

    attendance_day = await _get_or_create_day(db, assignment_id, day)
    attendance_day.status = AttendanceDayStatus.RED
    if data.get("note") is not None:
        attendance_day.note = data["note"]

    await db.commit()
    return await get_day(db, attendance_day.id)


# ─── Super Admin override ───────────────────────────────


async def super_admin_override(
    db: AsyncSession,
    day_id: UUID,
    super_admin_user_id: UUID,
    payload: BaseModel,
) -> dict[str, Any]:
    attendance_day = await db.get(AttendanceDay, day_id)
    if not attendance_day:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kun topilmadi")

    data = payload.model_dump()
    _prev_status_for_notify = attendance_day.status
    new_status = AttendanceDayStatus(data["new_status"])

    if attendance_day.status == new_status:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Allaqachon {new_status.value}")

    override = AttendanceOverride(
        attendance_day_id=attendance_day.id,
        super_admin_id=super_admin_user_id,
        previous_status=attendance_day.status,
        new_status=new_status,
        reason=data["reason"],
    )
    db.add(override)

    attendance_day.status = new_status
    attendance_day.approved_by_id = super_admin_user_id
    attendance_day.approved_at = datetime.now(UTC)

    student_uid = await _student_user_id_for_assignment(db, attendance_day.assignment_id)
    if student_uid:
        await notification_svc.create(
            db,
            user_id=student_uid,
            type=NotificationType.ATTENDANCE_OVERRIDE,
            title="Davomat super admin tomonidan o'zgartirildi",
            body=(
                f"{attendance_day.date}: {_prev_status_for_notify.value} → "
                f"{new_status.value}. Sabab: {data['reason']}"
            ),
            data={
                "assignment_id": str(attendance_day.assignment_id),
                "day_id": str(attendance_day.id),
            },
        )

    await db.commit()
    return await get_day(db, attendance_day.id)


# ─── Super Admin: kunni to'liq tahrirlash (upsert) ──────


def _validate_times(
    day: date, check_in_at: datetime | None, check_out_at: datetime | None
) -> tuple[datetime | None, datetime | None]:
    """Vaqtlar kun bilan mos va mantiqan to'g'ri bo'lishini tekshiradi; UTC ga keltiradi."""
    ci = _as_utc(check_in_at) if check_in_at else None
    co = _as_utc(check_out_at) if check_out_at else None
    if ci is not None and ci.astimezone(UZB_TZ).date() != day:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Kelish vaqti tanlangan kunga mos emas")
    if co is not None:
        if ci is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Ketish vaqti uchun kelish vaqti ham kerak"
            )
        if co < ci:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Ketish vaqti kelish vaqtidan oldin bo'lishi mumkin emas",
            )
        if co - ci > timedelta(hours=24):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Kelish va ketish orasidagi vaqt 24 soatdan oshmasin"
            )
    return ci, co


async def super_admin_set_day(
    db: AsyncSession,
    *,
    super_admin_user_id: UUID,
    payload: BaseModel,
    day_id: UUID | None = None,
    assignment_id: UUID | None = None,
    day: date | None = None,
) -> dict[str, Any]:
    """Kunni to'liq boshqarish: status + kelish/ketish vaqtlari + izoh.

    `day_id` berilsa mavjud kun tahrirlanadi; aks holda (`assignment_id`, `day`) bo'yicha
    topiladi yoki YARATILADI (kelajakdagi kunni oldindan yashil qilish). Status o'zgarsa
    AttendanceOverride yoziladi va talabaga xabar boradi.
    """
    data = payload.model_dump(exclude_unset=True)
    new_status = AttendanceDayStatus(data["status"])
    reason: str = data["reason"]

    if day_id is not None:
        attendance_day = await db.get(AttendanceDay, day_id)
        if not attendance_day:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Kun topilmadi")
        assignment = await db.get(PracticeAssignment, attendance_day.assignment_id)
        if not assignment:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Biriktirish topilmadi")
        created = False
    else:
        if assignment_id is None or day is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Biriktirish va sana kerak")
        assignment = await db.get(PracticeAssignment, assignment_id)
        if not assignment:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Biriktirish topilmadi")
        _verify_day_in_range(assignment, day)
        existing = (
            await db.execute(
                select(AttendanceDay).where(
                    AttendanceDay.assignment_id == assignment_id,
                    AttendanceDay.date == day,
                )
            )
        ).scalar_one_or_none()
        created = existing is None
        attendance_day = existing or AttendanceDay(
            id=uuid4(),
            assignment_id=assignment_id,
            date=day,
            status=AttendanceDayStatus.PENDING,
        )
        if created:
            db.add(attendance_day)

    previous_status = attendance_day.status
    changed = created or previous_status != new_status

    # Vaqtlar: berilmagan → o'zgarmaydi; None → tozalanadi
    ci_given = "check_in_at" in data
    co_given = "check_out_at" in data
    if ci_given or co_given:
        ci_val = data["check_in_at"] if ci_given else attendance_day.check_in_at
        co_val = data["check_out_at"] if co_given else attendance_day.check_out_at
        ci, co = _validate_times(attendance_day.date, ci_val, co_val)
        if attendance_day.check_in_at != ci or attendance_day.check_out_at != co:
            changed = True
        attendance_day.check_in_at = ci
        attendance_day.check_out_at = co

    if "note" in data and data["note"] != attendance_day.note:
        attendance_day.note = data["note"]
        changed = True

    if not changed:
        raise HTTPException(status.HTTP_409_CONFLICT, "O'zgarish yo'q")

    now = datetime.now(UTC)
    if created or previous_status != new_status:
        db.add(
            AttendanceOverride(
                attendance_day_id=attendance_day.id,
                super_admin_id=super_admin_user_id,
                previous_status=previous_status,
                new_status=new_status,
                reason=reason,
            )
        )
    attendance_day.status = new_status
    attendance_day.approved_by_id = super_admin_user_id
    attendance_day.approved_at = now
    if created and new_status == AttendanceDayStatus.GREEN and attendance_day.note is None:
        attendance_day.note = reason

    student_uid = await _student_user_id_for_assignment(db, attendance_day.assignment_id)
    if student_uid and (created or previous_status != new_status):
        await notification_svc.create(
            db,
            user_id=student_uid,
            type=NotificationType.ATTENDANCE_OVERRIDE,
            title="Davomat super admin tomonidan o'zgartirildi",
            body=(
                f"{attendance_day.date}: "
                f"{'yangi' if created else previous_status.value} → {new_status.value}. "
                f"Sabab: {reason}"
            ),
            data={
                "assignment_id": str(attendance_day.assignment_id),
                "day_id": str(attendance_day.id),
            },
        )

    await db.commit()
    return await get_day(db, attendance_day.id)


# ─── Super Admin: sana oralig'ini belgilash ─────────────


def _range_candidate_days(
    assignment: PracticeAssignment,
    date_from: date,
    date_to: date,
    *,
    only_required_weekdays: bool,
) -> list[date]:
    required = required_weekday_set(assignment)
    out: list[date] = []
    cur = date_from
    while cur <= date_to:
        if not only_required_weekdays or cur.isoweekday() in required:
            out.append(cur)
        cur += timedelta(days=1)
    return out


def _is_auto_red(day: AttendanceDay) -> bool:
    """Tizim tomonidan 'kelmadi' deb yaratilgan kun — talaba check-in qilmagan."""
    return day.status == AttendanceDayStatus.RED and day.check_in_at is None


async def super_admin_set_range(
    db: AsyncSession,
    assignment_id: UUID,
    super_admin_user_id: UUID,
    payload: BaseModel,
    *,
    commit: bool = True,
) -> dict[str, Any]:
    """Bir biriktirish uchun [date_from, date_to] oralig'ini green/red qiladi.

    mode="fill" — yozuvi yo'q, kutilayotgan (pending) va avto-qizil (check-in'siz) kunlar;
    mode="overwrite" — oraliqdagi barcha kunlar. Har o'zgargan kun uchun override yoziladi.
    """
    assignment = await db.get(PracticeAssignment, assignment_id)
    if not assignment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Biriktirish topilmadi")

    data = payload.model_dump()
    new_status = AttendanceDayStatus(data["status"])
    reason: str = data["reason"]
    mode: str = data.get("mode", "fill")
    only_required: bool = data.get("only_required_weekdays", True)

    d_from = max(data["date_from"], assignment.start_date)
    d_to = min(data["date_to"], assignment.end_date)
    if d_from > d_to:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Oraliq amaliyot muddati bilan kesishmaydi "
            f"({assignment.start_date} – {assignment.end_date})",
        )

    candidates = _range_candidate_days(
        assignment, d_from, d_to, only_required_weekdays=only_required
    )
    existing_rows = (
        (
            await db.execute(
                select(AttendanceDay).where(
                    AttendanceDay.assignment_id == assignment_id,
                    AttendanceDay.date >= d_from,
                    AttendanceDay.date <= d_to,
                )
            )
        )
        .scalars()
        .all()
    )
    existing = {d.date: d for d in existing_rows}

    now = datetime.now(UTC)
    created = updated = skipped = 0
    for cur in candidates:
        day_row = existing.get(cur)
        if day_row is None:
            day_row = AttendanceDay(
                id=uuid4(),
                assignment_id=assignment_id,
                date=cur,
                status=new_status,
                note=reason if new_status == AttendanceDayStatus.GREEN else NOTE_MISSING_DAY,
                approved_by_id=super_admin_user_id,
                approved_at=now,
            )
            db.add(day_row)
            db.add(
                AttendanceOverride(
                    attendance_day_id=day_row.id,
                    super_admin_id=super_admin_user_id,
                    previous_status=AttendanceDayStatus.PENDING,
                    new_status=new_status,
                    reason=reason,
                )
            )
            created += 1
            continue

        if day_row.status == new_status:
            skipped += 1
            continue
        if mode == "fill" and not (
            day_row.status == AttendanceDayStatus.PENDING or _is_auto_red(day_row)
        ):
            skipped += 1
            continue

        db.add(
            AttendanceOverride(
                attendance_day_id=day_row.id,
                super_admin_id=super_admin_user_id,
                previous_status=day_row.status,
                new_status=new_status,
                reason=reason,
            )
        )
        day_row.status = new_status
        day_row.approved_by_id = super_admin_user_id
        day_row.approved_at = now
        if new_status == AttendanceDayStatus.GREEN and (
            day_row.note is None or day_row.note in (NOTE_MISSING_DAY, NOTE_PENDING_EXPIRED)
        ):
            day_row.note = reason
        updated += 1

    if created or updated:
        student_uid = await _student_user_id_for_assignment(db, assignment_id)
        if student_uid:
            await notification_svc.create(
                db,
                user_id=student_uid,
                type=NotificationType.ATTENDANCE_OVERRIDE,
                title="Davomat oralig'i super admin tomonidan belgilandi",
                body=(
                    f"{d_from} – {d_to}: {created + updated} kun → {new_status.value}. "
                    f"Sabab: {reason}"
                ),
                data={"assignment_id": str(assignment_id)},
            )
        if commit:
            await db.commit()

    return {
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "total_days": len(candidates),
        "date_from": d_from,
        "date_to": d_to,
    }


async def super_admin_bulk_set_range(
    db: AsyncSession,
    super_admin_user_id: UUID,
    payload: BaseModel,
) -> dict[str, Any]:
    """Bir xil oraliqni ko'p biriktirish uchun belgilash. Har biri alohida natija; commit bitta."""
    data = payload.model_dump()
    assignment_ids: list[UUID] = list(dict.fromkeys(data["assignment_ids"]))
    totals = {"assignments": 0, "created": 0, "updated": 0, "skipped": 0}
    failed: list[dict[str, Any]] = []

    for aid in assignment_ids:
        try:
            res = await super_admin_set_range(db, aid, super_admin_user_id, payload, commit=False)
        except HTTPException as e:
            failed.append({"assignment_id": aid, "error": str(e.detail)})
            continue
        totals["assignments"] += 1
        totals["created"] += res["created"]
        totals["updated"] += res["updated"]
        totals["skipped"] += res["skipped"]

    await db.commit()
    return {**totals, "failed": failed}


# ─── Read ────────────────────────────────────────────────


def _base_day_select() -> Any:
    """Kun + talaba + obyekt kontekstini qo'shadi. approved_by_name keyin hydrate qilinadi."""
    return (
        select(
            AttendanceDay.id,
            AttendanceDay.assignment_id,
            AttendanceDay.date,
            AttendanceDay.status,
            AttendanceDay.check_in_at,
            AttendanceDay.check_out_at,
            AttendanceDay.approved_by_id,
            AttendanceDay.approved_at,
            AttendanceDay.note,
            AttendanceDay.created_at,
            AttendanceDay.updated_at,
            Student.id.label("student_id"),
            Student.hemis_id.label("student_hemis_id"),
            func.concat(
                func.coalesce(User.last_name, ""),
                " ",
                func.coalesce(User.first_name, ""),
            ).label("student_full_name"),
            Organization.name.label("organization_name"),
            Area.name.label("area_name"),
        )
        .join(PracticeAssignment, PracticeAssignment.id == AttendanceDay.assignment_id)
        .join(Student, Student.id == PracticeAssignment.student_id)
        .outerjoin(User, User.id == Student.user_id)
        .outerjoin(Organization, Organization.id == PracticeAssignment.organization_id)
        .outerjoin(Area, Area.id == PracticeAssignment.area_id)
    )


async def _hydrate_approver_name(
    db: AsyncSession, rows: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    approver_ids = {r["approved_by_id"] for r in rows if r.get("approved_by_id")}
    if not approver_ids:
        for r in rows:
            r["approved_by_name"] = None
        return rows
    stmt = select(User.id, User.last_name, User.first_name).where(User.id.in_(approver_ids))
    approver_map = {
        u_id: f"{last} {first}".strip() for u_id, last, first in (await db.execute(stmt)).all()
    }
    for r in rows:
        r["approved_by_name"] = (
            approver_map.get(r["approved_by_id"]) if r.get("approved_by_id") else None
        )
    return rows


def _faculty_scope(stmt: Select[Any], faculty_id: UUID) -> Select[Any]:
    """Biriktirish snapshot guruhi (yo'q bo'lsa talabaning guruhi) orqali fakultet filtri."""
    grp = aliased(Group)
    direction = aliased(Direction)
    return (
        stmt.join(grp, grp.id == func.coalesce(PracticeAssignment.group_id, Student.group_id))
        .join(direction, direction.id == grp.direction_id)
        .where(direction.faculty_id == faculty_id)
    )


async def list_days(
    db: AsyncSession,
    offset: int,
    limit: int,
    *,
    assignment_id: UUID | None = None,
    student_id: UUID | None = None,
    status_filter: AttendanceDayStatus | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    group_id: UUID | None = None,
    direction_id: UUID | None = None,
    faculty_id: UUID | None = None,
    search: str | None = None,
    supervisor_user_id: UUID | None = None,
    academic_year_id: UUID | None = None,
    semester: Any | None = None,
) -> tuple[list[dict[str, Any]], int]:
    # O'tgan qolib ketgan kunlarni avto-qizil qilish (global variant throttle bilan)
    await sync_missed_attendance_days(db, assignment_id=assignment_id, student_id=student_id)

    stmt = _base_day_select()

    if assignment_id:
        stmt = stmt.where(AttendanceDay.assignment_id == assignment_id)
    if student_id:
        stmt = stmt.where(Student.id == student_id)
    if status_filter:
        stmt = stmt.where(AttendanceDay.status == status_filter)
    if date_from:
        stmt = stmt.where(AttendanceDay.date >= date_from)
    if date_to:
        stmt = stmt.where(AttendanceDay.date <= date_to)
    if search:
        stmt = stmt.where(_search_clause(search))
    if academic_year_id:
        stmt = stmt.where(PracticeAssignment.academic_year_id == academic_year_id)
    if semester is not None:
        stmt = stmt.where(PracticeAssignment.semester == semester)
    if supervisor_user_id:
        stmt = stmt.join(Supervisor, Supervisor.id == PracticeAssignment.supervisor_id).where(
            Supervisor.user_id == supervisor_user_id
        )

    # Guruh/yo'nalish filtri — biriktirish paytidagi guruh (snapshot), bo'lmasa talabaning guruhi
    effective_group = func.coalesce(PracticeAssignment.group_id, Student.group_id)
    if group_id:
        stmt = stmt.where(effective_group == group_id)
    if direction_id:
        grp = aliased(Group)
        stmt = stmt.join(grp, grp.id == effective_group).where(grp.direction_id == direction_id)
    if faculty_id:
        stmt = _faculty_scope(stmt, faculty_id)

    total = (
        await db.execute(select(func.count()).select_from(stmt.order_by(None).subquery()))
    ).scalar_one()
    rows = (
        (
            await db.execute(
                stmt.order_by(AttendanceDay.date.desc(), AttendanceDay.created_at.desc())
                .offset(offset)
                .limit(limit)
            )
        )
        .mappings()
        .all()
    )
    items = [dict(r) for r in rows]
    items = await _hydrate_approver_name(db, items)
    return items, total


async def get_day(db: AsyncSession, day_id: UUID) -> dict[str, Any]:
    row = (
        (await db.execute(_base_day_select().where(AttendanceDay.id == day_id))).mappings().first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kun topilmadi")
    items = await _hydrate_approver_name(db, [dict(row)])
    day_dict = items[0]

    events = (
        (
            await db.execute(
                select(AttendanceEvent)
                .where(AttendanceEvent.attendance_day_id == day_id)
                .execution_options(populate_existing=True)
                .order_by(AttendanceEvent.event_at.asc())
            )
        )
        .scalars()
        .all()
    )
    day_dict["events"] = list(events)

    return day_dict


async def assert_day_visible_to(db: AsyncSession, day_id: UUID, user: User) -> None:
    """Kun foydalanuvchiga ko'rinishi mumkinmi — talaba o'zi, supervizor o'z talabasi,
    fakultet admini o'z fakulteti. Ruxsat bo'lmasa 404 (mavjudligini ham ochmaymiz)."""
    if user.role == UserRole.SUPER_ADMIN:
        return
    not_found = HTTPException(status.HTTP_404_NOT_FOUND, "Kun topilmadi")

    base = (
        select(AttendanceDay.id)
        .join(PracticeAssignment, PracticeAssignment.id == AttendanceDay.assignment_id)
        .join(Student, Student.id == PracticeAssignment.student_id)
        .where(AttendanceDay.id == day_id)
    )
    if user.role == UserRole.STUDENT:
        base = base.where(Student.user_id == user.id)
    elif user.role == UserRole.SUPERVISOR:
        base = base.join(Supervisor, Supervisor.id == PracticeAssignment.supervisor_id).where(
            Supervisor.user_id == user.id
        )
    elif user.role == UserRole.ADMIN:
        if user.faculty_id:
            base = _faculty_scope(base, user.faculty_id)
    else:
        raise not_found

    if (await db.execute(base)).scalar_one_or_none() is None:
        raise not_found


async def list_overrides(db: AsyncSession, day_id: UUID) -> list[dict[str, Any]]:
    stmt = (
        select(
            AttendanceOverride.id,
            AttendanceOverride.attendance_day_id,
            AttendanceOverride.super_admin_id,
            (User.last_name + " " + User.first_name).label("super_admin_name"),
            AttendanceOverride.previous_status,
            AttendanceOverride.new_status,
            AttendanceOverride.reason,
            AttendanceOverride.created_at,
        )
        .join(User, User.id == AttendanceOverride.super_admin_id)
        .where(AttendanceOverride.attendance_day_id == day_id)
        .order_by(AttendanceOverride.created_at.desc())
    )
    rows = (await db.execute(stmt)).mappings().all()
    return [dict(r) for r in rows]


# ─── Talaba-markazli jamlanma ───────────────────────────


async def summary(
    db: AsyncSession,
    offset: int,
    limit: int,
    *,
    search: str | None = None,
    faculty_id: UUID | None = None,
    direction_id: UUID | None = None,
    group_id: UUID | None = None,
    academic_year_id: UUID | None = None,
    practice_type_id: UUID | None = None,
    semester: Any | None = None,
    assignment_status: AssignmentStatus | None = None,
    include_archived: bool = False,
    sort: str = "name",
) -> tuple[list[dict[str, Any]], int]:
    """Har bir biriktirish uchun davomat jamlanmasi (talaba, obyekt, hisob-kitob)."""
    await sync_missed_attendance_days(db)
    today = today_uzb()

    agg = (
        select(
            AttendanceDay.assignment_id.label("aid"),
            func.count().label("total_records"),
            func.count()
            .filter(AttendanceDay.status == AttendanceDayStatus.GREEN)
            .label("green_count"),
            func.count().filter(AttendanceDay.status == AttendanceDayStatus.RED).label("red_count"),
            func.count()
            .filter(AttendanceDay.status == AttendanceDayStatus.PENDING)
            .label("pending_count"),
            # Foiz uchun: faqat bugungacha bo'lgan yashil kunlar (oldindan belgilangan
            # kelajak kunlari jadvalda ko'rinadi, lekin foizni sun'iy oshirmaydi)
            func.count()
            .filter(
                AttendanceDay.status == AttendanceDayStatus.GREEN,
                AttendanceDay.date <= today,
            )
            .label("green_to_date"),
            func.count().filter(AttendanceDay.date <= today).label("records_to_date"),
            func.max(AttendanceDay.check_in_at).label("last_check_in_at"),
        )
        .group_by(AttendanceDay.assignment_id)
        .subquery()
    )
    sup_user = aliased(User)
    grp = aliased(Group)
    direction = aliased(Direction)
    faculty = aliased(Faculty)

    stmt = (
        select(
            PracticeAssignment.id.label("assignment_id"),
            Student.id.label("student_id"),
            func.concat(
                func.coalesce(User.last_name, ""), " ", func.coalesce(User.first_name, "")
            ).label("student_full_name"),
            Student.hemis_id.label("student_hemis_id"),
            User.username.label("student_username"),
            grp.name.label("group_name"),
            func.coalesce(PracticeAssignment.course, grp.course).label("course"),
            direction.name.label("direction_name"),
            faculty.name.label("faculty_name"),
            PracticeType.name.label("practice_type_name"),
            Organization.name.label("organization_name"),
            Area.name.label("area_name"),
            func.nullif(
                func.trim(
                    func.concat(
                        func.coalesce(sup_user.last_name, ""),
                        " ",
                        func.coalesce(sup_user.first_name, ""),
                    )
                ),
                "",
            ).label("supervisor_full_name"),
            PracticeAssignment.start_date,
            PracticeAssignment.end_date,
            PracticeAssignment.required_weekdays,
            PracticeAssignment.status.label("assignment_status"),
            PracticeAssignment.semester,
            func.coalesce(agg.c.total_records, 0).label("total_records"),
            func.coalesce(agg.c.green_count, 0).label("green_count"),
            func.coalesce(agg.c.red_count, 0).label("red_count"),
            func.coalesce(agg.c.pending_count, 0).label("pending_count"),
            func.coalesce(agg.c.green_to_date, 0).label("green_to_date"),
            func.coalesce(agg.c.records_to_date, 0).label("records_to_date"),
            agg.c.last_check_in_at,
        )
        .select_from(PracticeAssignment)
        .join(Student, Student.id == PracticeAssignment.student_id)
        .join(User, User.id == Student.user_id)
        .outerjoin(grp, grp.id == func.coalesce(PracticeAssignment.group_id, Student.group_id))
        .outerjoin(direction, direction.id == grp.direction_id)
        .outerjoin(faculty, faculty.id == direction.faculty_id)
        .outerjoin(PracticeType, PracticeType.id == PracticeAssignment.practice_type_id)
        .outerjoin(Organization, Organization.id == PracticeAssignment.organization_id)
        .outerjoin(Area, Area.id == PracticeAssignment.area_id)
        .outerjoin(Supervisor, Supervisor.id == PracticeAssignment.supervisor_id)
        .outerjoin(sup_user, sup_user.id == Supervisor.user_id)
        .outerjoin(agg, agg.c.aid == PracticeAssignment.id)
    )

    if assignment_status is not None:
        stmt = stmt.where(PracticeAssignment.status == assignment_status)
    else:
        stmt = stmt.where(
            PracticeAssignment.status.in_([AssignmentStatus.ACTIVE, AssignmentStatus.DRAFT])
        )
    if not include_archived:
        stmt = stmt.where(PracticeAssignment.is_archived.is_(False))
    if search:
        stmt = stmt.where(_search_clause(search))
    if faculty_id:
        stmt = stmt.where(direction.faculty_id == faculty_id)
    if direction_id:
        stmt = stmt.where(grp.direction_id == direction_id)
    if group_id:
        stmt = stmt.where(grp.id == group_id)
    if academic_year_id:
        stmt = stmt.where(PracticeAssignment.academic_year_id == academic_year_id)
    if practice_type_id:
        stmt = stmt.where(PracticeAssignment.practice_type_id == practice_type_id)
    if semester is not None:
        stmt = stmt.where(PracticeAssignment.semester == semester)

    total = (
        await db.execute(select(func.count()).select_from(stmt.order_by(None).subquery()))
    ).scalar_one()

    ratio = (
        func.coalesce(agg.c.green_to_date, 0)
        * 1.0
        / func.nullif(func.coalesce(agg.c.records_to_date, 0), 0)
    )
    if sort == "percent_asc":
        stmt = stmt.order_by(ratio.asc().nulls_last(), User.last_name, User.first_name)
    elif sort == "percent_desc":
        stmt = stmt.order_by(ratio.desc().nulls_last(), User.last_name, User.first_name)
    elif sort == "red_desc":
        stmt = stmt.order_by(
            func.coalesce(agg.c.red_count, 0).desc(), User.last_name, User.first_name
        )
    else:
        stmt = stmt.order_by(User.last_name, User.first_name, PracticeAssignment.start_date)

    rows = (await db.execute(stmt.offset(offset).limit(limit))).mappings().all()
    items: list[dict[str, Any]] = []
    for r in rows:
        item = dict(r)
        item["expected_days_to_date"] = expected_days(
            item["start_date"], item["end_date"], item["required_weekdays"], upto=today
        )
        item["attendance_percent"] = compute_percent(
            green=item.pop("green_to_date", 0),
            record_total=item.pop("records_to_date", 0),
            start=item["start_date"],
            end=item["end_date"],
            weekdays=item["required_weekdays"],
            upto=today,
        )
        items.append(item)
    return items, total


# ─── Student self-lookup ─────────────────────────────────


async def student_today_status(
    db: AsyncSession, assignment_id: UUID, student_user_id: UUID
) -> dict[str, Any] | None:
    """Bugun uchun AttendanceDay (agar mavjud bo'lsa)."""
    await _get_assignment_for_student(db, assignment_id, student_user_id)
    # Talabaning o'tgan qolib ketgan kunlarini ham avto-sinxr qilish
    await sync_missed_attendance_days(db, assignment_id=assignment_id)

    today = today_uzb()

    today_day = (
        await db.execute(
            select(AttendanceDay).where(
                AttendanceDay.assignment_id == assignment_id,
                AttendanceDay.date == today,
            )
        )
    ).scalar_one_or_none()
    if today_day is not None and today_day.check_in_at is not None:
        return await get_day(db, today_day.id)
    # Bugun hali kelinmagan bo'lsa-yu, kechagi smena ochiq qolgan bo'lsa (kech kelib yarim
    # tundan keyin ketayotgan talaba) — "ketish" tugmasi chiqishi uchun o'sha kun qaytariladi.
    open_day = await _find_open_day(db, assignment_id, today, datetime.now(UTC))
    if open_day is not None:
        return await get_day(db, open_day.id)
    if today_day is None:
        return None
    return await get_day(db, today_day.id)


# ─── Bulk Action ─────────────────────────────────────────


async def bulk_update_status(
    db: AsyncSession,
    day_ids: list[UUID],
    new_status: AttendanceDayStatus,
    admin_user_id: UUID,
    note: str | None = None,
) -> dict[str, int]:
    if not day_ids:
        return {"updated_count": 0, "requested_count": 0}

    stmt = select(AttendanceDay).where(AttendanceDay.id.in_(day_ids))
    days = (await db.execute(stmt)).scalars().all()

    now = datetime.now(UTC)
    updated_count = 0
    reason = (note or "").strip() or "Ommaviy o'zgartirish (super admin)"

    for day in days:
        if day.status == new_status:
            continue
        old_status = day.status
        db.add(
            AttendanceOverride(
                attendance_day_id=day.id,
                super_admin_id=admin_user_id,
                previous_status=old_status,
                new_status=new_status,
                reason=reason,
            )
        )
        day.status = new_status
        day.approved_by_id = admin_user_id
        day.approved_at = now
        if note is not None:
            day.note = note

        student_uid = await _student_user_id_for_assignment(db, day.assignment_id)
        if student_uid:
            if new_status == AttendanceDayStatus.RED:
                await notification_svc.create(
                    db,
                    user_id=student_uid,
                    type=NotificationType.ATTENDANCE_REJECTED,
                    title="Davomat rad etildi",
                    body=f"{day.date}: {note or 'Rad etildi'}",
                    data={"assignment_id": str(day.assignment_id), "day_id": str(day.id)},
                )
            else:
                await notification_svc.create(
                    db,
                    user_id=student_uid,
                    type=NotificationType.ATTENDANCE_OVERRIDE,
                    title="Davomat super admin tomonidan o'zgartirildi",
                    body=f"{day.date}: {old_status.value} → {new_status.value}. Sabab: {reason}",
                    data={"assignment_id": str(day.assignment_id), "day_id": str(day.id)},
                )
        updated_count += 1

    await db.commit()
    return {"updated_count": updated_count, "requested_count": len(day_ids)}
