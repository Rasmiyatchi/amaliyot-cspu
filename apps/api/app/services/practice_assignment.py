"""PracticeAssignment service — validation, capacity check, CRUD."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import AcademicYear, Direction, Faculty, Group
from app.models.area import Area
from app.models.enums import AssignmentStatus, ObjectKind
from app.models.organization import Organization
from app.models.practice_assignment import PracticeAssignment
from app.models.practice_type import PracticeType
from app.models.student import Student
from app.models.supervisor import Supervisor
from app.models.user import User
from app.schemas.practice_assignment import (
    BulkAssignmentError,
    BulkAssignmentResult,
)

ACTIVE_STATUSES = (AssignmentStatus.DRAFT, AssignmentStatus.ACTIVE)


class ValidationError(ValueError):
    """Assignment validation failure — API'ga 400 bo'lib chiqariladi."""


def _base_read_select() -> Any:
    """Flat select: assignment + joined names."""
    return (
        select(
            PracticeAssignment.id,
            PracticeAssignment.student_id,
            (User.last_name + " " + User.first_name).label("student_full_name"),
            Student.hemis_id.label("student_hemis_id"),
            Group.name.label("student_group_name"),
            Group.course.label("student_course"),
            PracticeAssignment.practice_type_id,
            PracticeType.code.label("practice_type_code"),
            PracticeType.name.label("practice_type_name"),
            PracticeType.requires_contract,
            PracticeAssignment.academic_year_id,
            AcademicYear.name.label("academic_year_name"),
            PracticeAssignment.organization_id,
            Organization.name.label("organization_name"),
            PracticeAssignment.area_id,
            Area.name.label("area_name"),
            PracticeAssignment.supervisor_id,
            PracticeAssignment.start_date,
            PracticeAssignment.end_date,
            PracticeAssignment.status,
            PracticeAssignment.final_grade,
            PracticeAssignment.credit_earned,
            PracticeAssignment.cancelled_reason,
            PracticeAssignment.cancelled_at,
            PracticeAssignment.notes,
            PracticeAssignment.created_at,
            PracticeAssignment.updated_at,
        )
        .join(Student, Student.id == PracticeAssignment.student_id)
        .join(User, User.id == Student.user_id)
        .join(PracticeType, PracticeType.id == PracticeAssignment.practice_type_id)
        .join(AcademicYear, AcademicYear.id == PracticeAssignment.academic_year_id)
        .outerjoin(Group, Group.id == Student.group_id)
        .outerjoin(Direction, Direction.id == Group.direction_id)
        .outerjoin(Faculty, Faculty.id == Direction.faculty_id)
        .outerjoin(Organization, Organization.id == PracticeAssignment.organization_id)
        .outerjoin(Area, Area.id == PracticeAssignment.area_id)
    )


def _row_with_supervisor_name(r: dict[str, Any], supervisor_map: dict[UUID, str]) -> dict[str, Any]:
    out = dict(r)
    sid = out.get("supervisor_id")
    out["supervisor_full_name"] = supervisor_map.get(sid) if sid else None
    return out


async def _load_supervisor_names(db: AsyncSession, supervisor_ids: set[UUID]) -> dict[UUID, str]:
    if not supervisor_ids:
        return {}
    rows = (
        await db.execute(
            select(
                Supervisor.id,
                (User.last_name + " " + User.first_name).label("full_name"),
            )
            .join(User, User.id == Supervisor.user_id)
            .where(Supervisor.id.in_(supervisor_ids))
        )
    ).all()
    return {row[0]: row[1] for row in rows}


# ─── Validation ───────────────────────────────────────────


async def _validate_and_resolve(
    db: AsyncSession,
    *,
    student_id: UUID,
    practice_type_id: UUID,
    academic_year_id: UUID,
    organization_id: UUID | None,
    area_id: UUID | None,
    supervisor_id: UUID | None,
    start_date: Any,
    end_date: Any,
    exclude_assignment_id: UUID | None = None,
) -> dict[str, Any]:
    """Barcha validatsiyani bajaradi. Xato bo'lsa ValidationError raise qiladi.

    Qaytaradi: {student, practice_type, academic_year, organization, area, supervisor}
    """
    student = await db.get(Student, student_id)
    if not student:
        raise ValidationError(f"Talaba topilmadi: {student_id}")

    pt = await db.get(PracticeType, practice_type_id)
    if not pt:
        raise ValidationError(f"Amaliyot turi topilmadi: {practice_type_id}")
    if not pt.is_active:
        raise ValidationError(f"Amaliyot turi aktiv emas: {pt.code}")

    ay = await db.get(AcademicYear, academic_year_id)
    if not ay:
        raise ValidationError(f"Akademik yil topilmadi: {academic_year_id}")

    # XOR
    if bool(organization_id) == bool(area_id):
        raise ValidationError("organization_id yoki area_id — faqat bittasi ko'rsatilishi kerak")

    # Object kind compatibility
    if pt.object_kind == ObjectKind.ORGANIZATION and not organization_id:
        raise ValidationError(f"'{pt.name}' amaliyot turi tashkilot talab qiladi, hudud emas")
    if pt.object_kind == ObjectKind.AREA and not area_id:
        raise ValidationError(f"'{pt.name}' amaliyot turi hudud talab qiladi, tashkilot emas")

    organization = None
    if organization_id:
        organization = await db.get(Organization, organization_id)
        if not organization:
            raise ValidationError(f"Tashkilot topilmadi: {organization_id}")
        if not organization.is_active:
            raise ValidationError(f"Tashkilot aktiv emas: {organization.name}")

    area = None
    if area_id:
        area = await db.get(Area, area_id)
        if not area:
            raise ValidationError(f"Hudud topilmadi: {area_id}")
        if not area.is_active:
            raise ValidationError(f"Hudud aktiv emas: {area.name}")

    supervisor = None
    if supervisor_id:
        supervisor = await db.get(Supervisor, supervisor_id)
        if not supervisor:
            raise ValidationError(f"Supervizor topilmadi: {supervisor_id}")
        if not supervisor.is_active:
            raise ValidationError(f"Supervizor aktiv emas: {supervisor_id}")
        # Supervisor'ning tashkiloti assignment tashkiloti bilan mos kelsinligini tekshirish
        if (
            organization_id
            and supervisor.organization_id
            and supervisor.organization_id != organization_id
        ):
            raise ValidationError("Supervizor boshqa tashkilotga biriktirilgan")

    # Sana + davomiylik (calendar span — ta'tillarni ham o'z ichiga olishi mumkin)
    if end_date < start_date:
        raise ValidationError("end_date start_date'dan oldin bo'lolmaydi")
    duration_days = (end_date - start_date).days
    weeks = duration_days / 7
    if weeks + 0.01 < pt.min_weeks:
        raise ValidationError(f"Davomiylik juda qisqa: {weeks:.1f} hafta (min: {pt.min_weeks})")
    # max check — 4+2 kabi uzoq amaliyotlar qish ta'tili orqali o'tadi, shuning uchun slack
    max_allowed = pt.max_weeks * 1.5 + 2
    if weeks > max_allowed:
        raise ValidationError(
            f"Davomiylik juda uzun: {weeks:.1f} hafta "
            f"(max: {pt.max_weeks}, ta'til bilan: {max_allowed:.0f})"
        )

    # Course check (agar talaba guruhga biriktirilgan bo'lsa)
    if pt.allowed_courses and student.group_id:
        group = await db.get(Group, student.group_id)
        if group and group.course not in pt.allowed_courses:
            raise ValidationError(
                f"{group.course}-kurs '{pt.name}' uchun ruxsat etilmagan "
                f"(ruxsat: {pt.allowed_courses})"
            )

    # Takroriy biriktirish yo'qligi
    dup_stmt = select(PracticeAssignment.id).where(
        PracticeAssignment.student_id == student_id,
        PracticeAssignment.practice_type_id == practice_type_id,
        PracticeAssignment.academic_year_id == academic_year_id,
        PracticeAssignment.status.in_(ACTIVE_STATUSES),
    )
    if exclude_assignment_id:
        dup_stmt = dup_stmt.where(PracticeAssignment.id != exclude_assignment_id)
    if (await db.execute(dup_stmt)).scalar_one_or_none():
        raise ValidationError(
            "Ushbu talaba ushbu o'quv yilida shu amaliyot turiga allaqachon biriktirilgan"
        )

    # Capacity tekshirish
    async def count_active(filter_clause: Any) -> int:
        stmt = select(func.count(PracticeAssignment.id)).where(
            filter_clause, PracticeAssignment.status.in_(ACTIVE_STATUSES)
        )
        if exclude_assignment_id:
            stmt = stmt.where(PracticeAssignment.id != exclude_assignment_id)
        return (await db.execute(stmt)).scalar_one()

    if organization and organization.capacity:
        current = await count_active(PracticeAssignment.organization_id == organization.id)
        if current >= organization.capacity:
            raise ValidationError(f"Tashkilot sig'imi to'la ({current}/{organization.capacity})")

    if area and area.capacity:
        current = await count_active(PracticeAssignment.area_id == area.id)
        if current >= area.capacity:
            raise ValidationError(f"'{area.name}' hududi sig'imi to'la ({current}/{area.capacity})")

    if supervisor and supervisor.capacity:
        current = await count_active(PracticeAssignment.supervisor_id == supervisor.id)
        if current >= supervisor.capacity:
            raise ValidationError(f"Supervizor sig'imi to'la ({current}/{supervisor.capacity})")

    return {
        "student": student,
        "practice_type": pt,
        "academic_year": ay,
        "organization": organization,
        "area": area,
        "supervisor": supervisor,
    }


# ─── CRUD ─────────────────────────────────────────────────


async def _hydrate_reads(db: AsyncSession, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sup_ids = {r["supervisor_id"] for r in items if r.get("supervisor_id")}
    sup_map = await _load_supervisor_names(db, sup_ids)
    return [_row_with_supervisor_name(r, sup_map) for r in items]


async def list_assignments(
    db: AsyncSession,
    offset: int,
    limit: int,
    *,
    student_id: UUID | None = None,
    practice_type_id: UUID | None = None,
    academic_year_id: UUID | None = None,
    organization_id: UUID | None = None,
    area_id: UUID | None = None,
    supervisor_id: UUID | None = None,
    status_filter: AssignmentStatus | None = None,
    search: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    base = _base_read_select()
    count_stmt = (
        select(func.count(PracticeAssignment.id))
        .join(Student, Student.id == PracticeAssignment.student_id)
        .join(User, User.id == Student.user_id)
    )

    def apply(stmt: Any) -> Any:
        if student_id:
            stmt = stmt.where(PracticeAssignment.student_id == student_id)
        if practice_type_id:
            stmt = stmt.where(PracticeAssignment.practice_type_id == practice_type_id)
        if academic_year_id:
            stmt = stmt.where(PracticeAssignment.academic_year_id == academic_year_id)
        if organization_id:
            stmt = stmt.where(PracticeAssignment.organization_id == organization_id)
        if area_id:
            stmt = stmt.where(PracticeAssignment.area_id == area_id)
        if supervisor_id:
            stmt = stmt.where(PracticeAssignment.supervisor_id == supervisor_id)
        if status_filter:
            stmt = stmt.where(PracticeAssignment.status == status_filter)
        if search:
            like = f"%{search.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(User.first_name).like(like),
                    func.lower(User.last_name).like(like),
                    Student.hemis_id.like(f"%{search}%"),
                )
            )
        return stmt

    base = apply(base)
    count_stmt = apply(count_stmt)

    total = (await db.execute(count_stmt)).scalar_one()
    rows = (
        (
            await db.execute(
                base.order_by(PracticeAssignment.created_at.desc()).offset(offset).limit(limit)
            )
        )
        .mappings()
        .all()
    )

    items = [dict(r) for r in rows]
    items = await _hydrate_reads(db, items)
    return items, total


async def get_assignment(db: AsyncSession, id_: UUID) -> dict[str, Any]:
    row = (
        (await db.execute(_base_read_select().where(PracticeAssignment.id == id_)))
        .mappings()
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Biriktirish topilmadi: {id_}")
    hydrated = await _hydrate_reads(db, [dict(row)])
    return hydrated[0]


def _extract_validation_kwargs(
    payload: dict[str, Any], student_id_override: UUID | None = None
) -> dict[str, Any]:
    """Payload'dan _validate_and_resolve uchun kwargs ajratadi (notes va b. siz)."""
    return {
        "student_id": student_id_override or payload["student_id"],
        "practice_type_id": payload["practice_type_id"],
        "academic_year_id": payload["academic_year_id"],
        "organization_id": payload.get("organization_id"),
        "area_id": payload.get("area_id"),
        "supervisor_id": payload.get("supervisor_id"),
        "start_date": payload["start_date"],
        "end_date": payload["end_date"],
    }


async def create_assignment(db: AsyncSession, data: BaseModel) -> dict[str, Any]:
    payload = data.model_dump()
    try:
        await _validate_and_resolve(db, **_extract_validation_kwargs(payload))
    except ValidationError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    assignment = PracticeAssignment(**payload)
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return await get_assignment(db, assignment.id)


async def bulk_create_assignments(db: AsyncSession, data: BaseModel) -> BulkAssignmentResult:
    payload = data.model_dump()
    student_ids: list[UUID] = payload.pop("student_ids")

    errors: list[BulkAssignmentError] = []
    created_ids: list[UUID] = []

    for student_id in student_ids:
        try:
            await _validate_and_resolve(
                db,
                **_extract_validation_kwargs(payload, student_id_override=student_id),
            )
        except ValidationError as e:
            errors.append(BulkAssignmentError(student_id=student_id, error=str(e)))
            continue

        assignment = PracticeAssignment(**{**payload, "student_id": student_id})
        db.add(assignment)
        try:
            await db.flush()
            created_ids.append(assignment.id)
        except Exception as e:  # noqa: BLE001
            await db.rollback()
            errors.append(BulkAssignmentError(student_id=student_id, error=str(e)))
            continue

    if created_ids:
        await db.commit()
    logger.info(
        f"Bulk assignment: requested={len(student_ids)} created={len(created_ids)} "
        f"failed={len(errors)}"
    )
    return BulkAssignmentResult(
        requested=len(student_ids),
        created=len(created_ids),
        failed=errors,
        assignment_ids=created_ids,
    )


async def update_assignment(db: AsyncSession, id_: UUID, data: BaseModel) -> dict[str, Any]:
    assignment = await db.get(PracticeAssignment, id_)
    if not assignment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Biriktirish topilmadi: {id_}")

    payload = data.model_dump(exclude_unset=True)

    # Agar obyekt yoki sana o'zgarsa — revalidate
    revalidate_fields = {
        "organization_id",
        "area_id",
        "supervisor_id",
        "start_date",
        "end_date",
    }
    if any(k in payload for k in revalidate_fields):
        # Merge current + new for validation
        merged = {
            "student_id": assignment.student_id,
            "practice_type_id": assignment.practice_type_id,
            "academic_year_id": assignment.academic_year_id,
            "organization_id": payload.get("organization_id", assignment.organization_id),
            "area_id": payload.get("area_id", assignment.area_id),
            "supervisor_id": payload.get("supervisor_id", assignment.supervisor_id),
            "start_date": payload.get("start_date", assignment.start_date),
            "end_date": payload.get("end_date", assignment.end_date),
            "exclude_assignment_id": assignment.id,
        }
        try:
            await _validate_and_resolve(db, **merged)
        except ValidationError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    # Cancel timestamp avtomatik
    if (
        payload.get("status") == AssignmentStatus.CANCELLED
        and assignment.status != AssignmentStatus.CANCELLED
    ):
        assignment.cancelled_at = datetime.now(UTC)

    for key, value in payload.items():
        setattr(assignment, key, value)

    await db.commit()
    return await get_assignment(db, assignment.id)


async def list_my_assignments(
    db: AsyncSession, user: User
) -> list[dict[str, Any]]:
    """Joriy foydalanuvchiga tegishli amaliyot biriktirishlari.

    - student → o'z assignmentlari
    - supervisor → rahbarlik qilayotgan assignmentlar
    - admin / super_admin → bo'sh ro'yxat (ular umumiy list'dan foydalanadi)
    """
    from app.models.enums import UserRole

    stmt = _base_read_select()
    if user.role == UserRole.STUDENT:
        stmt = stmt.where(Student.user_id == user.id)
    elif user.role == UserRole.SUPERVISOR:
        stmt = stmt.join(
            Supervisor, Supervisor.id == PracticeAssignment.supervisor_id
        ).where(Supervisor.user_id == user.id)
    else:
        return []

    rows = (
        (await db.execute(stmt.order_by(PracticeAssignment.start_date.desc())))
        .mappings()
        .all()
    )
    items = [dict(r) for r in rows]
    return await _hydrate_reads(db, items)


async def delete_assignment(db: AsyncSession, id_: UUID) -> None:
    assignment = await db.get(PracticeAssignment, id_)
    if not assignment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Biriktirish topilmadi: {id_}")
    # Faqat DRAFT yoki CANCELLED bo'lgan assignment'larni o'chirish mumkin
    if assignment.status not in (AssignmentStatus.DRAFT, AssignmentStatus.CANCELLED):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Aktiv yoki tugagan biriktirishni o'chirib bo'lmaydi — avval bekor qiling",
        )
    await db.delete(assignment)
    await db.commit()
