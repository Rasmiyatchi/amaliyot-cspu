"""Attendance service — check-in/out, geo-fence, approve/reject, override.

Biznes mantiq:
- check_in: agar shu kunda AttendanceDay bo'lmasa — yaratiladi (status=PENDING).
  Keyin bosilsa — yangi event, lekin kun bir marta.
- check_out: shu kundagi mavjud AttendanceDay'ga qo'shiladi.
- supervisor_approve: PENDING → GREEN. approved_by va approved_at belgilanadi.
- supervisor_reject: PENDING → RED + note majburiy.
- admin_mark_red: kun o'tgan, check-in yo'q → RED qilib belgilash mumkin.
- super_admin_override: RED/PENDING → GREEN/RED. audit yoziladi.
"""

import math
from datetime import UTC, date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import Direction, Group
from app.models.area import Area
from app.models.attendance import AttendanceDay, AttendanceEvent, AttendanceOverride
from app.models.enums import (
    AssignmentStatus,
    AttendanceDayStatus,
    AttendanceEventKind,
    NotificationType,
)
from app.models.organization import Organization
from app.models.practice_assignment import PracticeAssignment
from app.models.student import Student
from app.models.supervisor import Supervisor
from app.models.user import User
from app.services import notification as notification_svc

MIN_PRACTICE_SECONDS = 6 * 3600  # 6 soat = 21600 soniya
UZB_TZ = timezone(timedelta(hours=5))


# ─── Geo-fence ────────────────────────────────────────────


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Ikki nuqta orasidagi masofa (metrda)."""
    r = 6371000.0  # Yer radiusi (m)
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(a))


def _evaluate_geo(
    *,
    lat: float | None,
    lng: float | None,
    accuracy_m: float | None,
    wifi_ssid: str | None,
    organization: Organization | None,
) -> tuple[float | None, bool]:
    """Geo-fence/WiFi tekshirish.

    Qaytaradi: (distance_m, is_within_fence).
    Agar tashkilotning geo markazi yo'q → is_within_fence=True (soft mode).
    Agar WiFi SSID whitelist'da — masofadan qat'iy nazar within=True.
    """
    if organization is None:
        return None, True  # Area amaliyot — geo tekshirilmaydi (hozircha)

    if wifi_ssid and organization.wifi_ssids and wifi_ssid in organization.wifi_ssids:
        return None, True

    if organization.geo_lat is None or organization.geo_lng is None:
        return None, True  # Tashkilot geo sozlanmagan

    if lat is None or lng is None:
        return None, False  # Geo kerak, ammo talaba yubormagan

    distance = haversine_m(
        float(organization.geo_lat),
        float(organization.geo_lng),
        float(lat),
        float(lng),
    )
    radius = float(organization.geo_radius_m or 100)
    # Accuracy tolerance — GPS xatoligini hisobga olamiz (max 50m)
    allowance = min(float(accuracy_m or 0), 50.0)
    return distance, distance <= radius + allowance


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


async def _student_user_id_for_assignment(
    db: AsyncSession, assignment_id: UUID
) -> UUID | None:
    stmt = (
        select(Student.user_id)
        .join(PracticeAssignment, PracticeAssignment.student_id == Student.id)
        .where(PracticeAssignment.id == assignment_id)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def _get_or_create_day(
    db: AsyncSession, assignment_id: UUID, day: date
) -> AttendanceDay:
    stmt = select(AttendanceDay).where(
        AttendanceDay.assignment_id == assignment_id,
        AttendanceDay.date == day,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        return existing

    attendance_day = AttendanceDay(
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


# ─── Missed Days Sync (Auto Red) ─────────────────────────


async def sync_missed_attendance_days(
    db: AsyncSession,
    *,
    assignment_id: UUID | None = None,
    student_id: UUID | None = None,
) -> None:
    """O'tib ketgan / qolib ketgan kunlarni avtomatik ravishda RED (qolib ketgan)
    holatiga o'tkazadi va bazada yaratadi/yangilaydi.
    """
    today = datetime.now(UZB_TZ).date()
    yesterday = today - timedelta(days=1)

    stmt = select(PracticeAssignment)
    if assignment_id:
        stmt = stmt.where(PracticeAssignment.id == assignment_id)
    elif student_id:
        stmt = stmt.where(PracticeAssignment.student_id == student_id)
    else:
        stmt = stmt.where(
            PracticeAssignment.status.in_([AssignmentStatus.ACTIVE, AssignmentStatus.DRAFT])
        )

    assignments = (await db.execute(stmt)).scalars().all()
    if not assignments:
        return

    has_changes = False
    for assign in assignments:
        start_d = assign.start_date
        end_d = min(assign.end_date, yesterday)
        if start_d > end_d:
            continue

        days_stmt = select(AttendanceDay).where(
            AttendanceDay.assignment_id == assign.id,
            AttendanceDay.date >= start_d,
            AttendanceDay.date <= end_d,
        )
        existing_days = (await db.execute(days_stmt)).scalars().all()
        existing_map = {d.date: d for d in existing_days}

        # 1. Mavjud bo'lib, lekin PENDING qolib ketgan o'tgan kunlarni RED qilish
        for d in existing_days:
            if d.status == AttendanceDayStatus.PENDING:
                d.status = AttendanceDayStatus.RED
                if not d.note:
                    d.note = "Kun davomida to'liq davomat (kelish/ketish) yakunlanmadi"
                has_changes = True

        # 2. Umuman davomat yozuvi bo'lmagan o'tgan ish kunlarini RED sifatida yaratish
        cur = start_d
        new_days = []
        required_wkdays = set(assign.required_weekdays) if assign.required_weekdays else None

        while cur <= end_d:
            # Agar required_weekdays belgilangan bo'lsa (ISO 1=Du..7=Ya):
            # Aks holda 1..6 (Dushanba-Shanba) amaliyot kuni hisoblanadi
            is_workday = (
                (cur.isoweekday() in required_wkdays)
                if required_wkdays
                else (cur.isoweekday() <= 6)
            )

            if is_workday and cur not in existing_map:
                new_day = AttendanceDay(
                    assignment_id=assign.id,
                    date=cur,
                    status=AttendanceDayStatus.RED,
                    note="Amaliyotga kelinmadi (qolib ketgan kun)",
                )
                new_days.append(new_day)
                existing_map[cur] = new_day
                has_changes = True
            cur += timedelta(days=1)

        if new_days:
            db.add_all(new_days)

    if has_changes:
        await db.flush()
        await db.commit()


# ─── Student actions ─────────────────────────────────────


async def student_check_in(
    db: AsyncSession,
    assignment_id: UUID,
    student_user_id: UUID,
    payload: BaseModel,
) -> dict[str, Any]:
    assignment = await _get_assignment_for_student(db, assignment_id, student_user_id)
    now = datetime.now(UTC)
    today = datetime.now(UZB_TZ).date()
    _verify_day_in_range(assignment, today)

    org_id = assignment.organization_id

    # O'tgan qolib ketgan kunlarni sinxronizatsiya qilish
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
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Geo-fence tashqarisida — tashkilot hududida emassiz"
            + (f" (masofa: {distance:.0f} m)" if distance is not None else ""),
        )

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

    if attendance_day.check_in_at is None:
        attendance_day.check_in_at = now
        attendance_day.status = AttendanceDayStatus.PENDING

    await db.commit()
    return await get_day(db, attendance_day.id)


async def student_check_out(
    db: AsyncSession,
    assignment_id: UUID,
    student_user_id: UUID,
    payload: BaseModel,
) -> dict[str, Any]:
    assignment = await _get_assignment_for_student(db, assignment_id, student_user_id)
    now = datetime.now(UTC)
    today = datetime.now(UZB_TZ).date()
    _verify_day_in_range(assignment, today)

    org_id = assignment.organization_id

    stmt = select(AttendanceDay).where(
        AttendanceDay.assignment_id == assignment_id,
        AttendanceDay.date == today,
    )
    attendance_day = (await db.execute(stmt)).scalar_one_or_none()
    if not attendance_day or not attendance_day.check_in_at:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Bugun avval kelish (check-in) qayd etilmagan",
        )

    # 6 soatlik majburiy amaliyot vaqti qoidasi
    check_in_time = attendance_day.check_in_at
    if check_in_time.tzinfo is None:
        check_in_time = check_in_time.replace(tzinfo=UTC)

    elapsed_seconds = (now - check_in_time).total_seconds()
    if elapsed_seconds < MIN_PRACTICE_SECONDS:
        remaining_seconds = int(MIN_PRACTICE_SECONDS - elapsed_seconds)
        rem_hours = remaining_seconds // 3600
        rem_minutes = (remaining_seconds % 3600) // 60
        rem_seconds = remaining_seconds % 60
        parts = []
        if rem_hours > 0:
            parts.append(f"{rem_hours} soat")
        if rem_minutes > 0:
            parts.append(f"{rem_minutes} daqiqa")
        if not parts:
            parts.append(f"{rem_seconds} soniya")
        rem_str = " ".join(parts)
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Ketishni qayd etish uchun kamida 6 soat amaliyot o'tgan bo'lishi shart. Qolgan vaqt: {rem_str}",
        )

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
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Geo-fence tashqarisida — tashkilot hududida emassiz"
            + (f" (masofa: {distance:.0f} m)" if distance is not None else ""),
        )

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

    today = datetime.now(UZB_TZ).date()
    if day >= today:
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
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Allaqachon {new_status.value}"
        )

    override = AttendanceOverride(
        attendance_day_id=attendance_day.id,
        super_admin_id=super_admin_user_id,
        previous_status=attendance_day.status,
        new_status=new_status,
        reason=data["reason"],
    )
    db.add(override)

    attendance_day.status = new_status

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
        u_id: f"{last} {first}".strip()
        for u_id, last, first in (await db.execute(stmt)).all()
    }
    for r in rows:
        r["approved_by_name"] = (
            approver_map.get(r["approved_by_id"]) if r.get("approved_by_id") else None
        )
    return rows


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
) -> tuple[list[dict[str, Any]], int]:
    # O'tgan qolib ketgan kunlarni avto-qizil qilish
    await sync_missed_attendance_days(
        db, assignment_id=assignment_id, student_id=student_id
    )

    base = _base_day_select()
    count_stmt = (
        select(func.count(AttendanceDay.id))
        .join(PracticeAssignment, PracticeAssignment.id == AttendanceDay.assignment_id)
        .join(Student, Student.id == PracticeAssignment.student_id)
    )

    def apply(stmt: Any) -> Any:
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
        if group_id:
            stmt = stmt.where(PracticeAssignment.group_id == group_id)
        if direction_id or faculty_id:
            stmt = stmt.join(Group, Group.id == PracticeAssignment.group_id)
            if direction_id:
                stmt = stmt.where(Group.direction_id == direction_id)
            if faculty_id:
                stmt = stmt.join(
                    Direction, Direction.id == Group.direction_id
                ).where(Direction.faculty_id == faculty_id)
        return stmt

    base = apply(base)
    count_stmt = apply(count_stmt)

    total = (await db.execute(count_stmt)).scalar_one()
    rows = (
        (
            await db.execute(
                base.order_by(AttendanceDay.date.desc(), AttendanceDay.created_at.desc())
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
        (await db.execute(_base_day_select().where(AttendanceDay.id == day_id)))
        .mappings()
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kun topilmadi")
    items = await _hydrate_approver_name(db, [dict(row)])
    day_dict = items[0]

    events = (
        await db.execute(
            select(AttendanceEvent)
            .where(AttendanceEvent.attendance_day_id == day_id)
            .execution_options(populate_existing=True)
            .order_by(AttendanceEvent.event_at.asc())
        )
    ).scalars().all()
    day_dict["events"] = list(events)

    return day_dict


async def list_overrides(
    db: AsyncSession, day_id: UUID
) -> list[dict[str, Any]]:
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


# ─── Student self-lookup ─────────────────────────────────


async def student_today_status(
    db: AsyncSession, assignment_id: UUID, student_user_id: UUID
) -> dict[str, Any] | None:
    """Bugun uchun AttendanceDay (agar mavjud bo'lsa)."""
    await _get_assignment_for_student(db, assignment_id, student_user_id)
    # Talabaning o'tgan qolib ketgan kunlarini ham avto-sinxr qilish
    await sync_missed_attendance_days(db, assignment_id=assignment_id)

    today = datetime.now(UZB_TZ).date()

    stmt = select(AttendanceDay.id).where(
        AttendanceDay.assignment_id == assignment_id,
        AttendanceDay.date == today,
    )
    day_id = (await db.execute(stmt)).scalar_one_or_none()
    if not day_id:
        return None
    return await get_day(db, day_id)
