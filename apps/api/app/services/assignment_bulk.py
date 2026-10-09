"""Qayta biriktirish (semestr ko'chirish) va ommaviy tahrirlash — TZ 08.10.2026, 1–2-bo'limlar.

Ikkala amal ham `dry_run` bilan oldindan ko'riladi; qo'llashda bitta tranzaksiya — oxirida
yagona commit. Element darajasidagi validatsiya xatolari ro'yxatda qaytadi (qolganlari
bajariladi), kutilmagan xato esa hammasini bekor qiladi (rollback) — qisman holat qolmaydi.

Qayta biriktirishda manba (eski semestr) yozuvlariga tegilmaydi: davomat, topshiriq,
hisobot tarixi saqlanadi; yangi biriktirish `source_assignment_id` orqali manbaga bog'lanadi.
"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import Direction, Group
from app.models.enums import AssignmentStatus, Semester
from app.models.practice_assignment import PracticeAssignment
from app.models.practice_type import PracticeType
from app.models.student import Student
from app.models.user import User
from app.schemas.assignment_bulk import (
    BULK_MAX,
    AssignmentBulkUpdateRequest,
    BulkChange,
    BulkUpdateItem,
    BulkUpdateResult,
    ReassignItem,
    ReassignRequest,
    ReassignResult,
    ReassignScope,
)
from app.services import practice_assignment as pa_svc
from app.services.audit_log import BULK_DETAIL_LIMIT, _jsonable
from app.services.practice_assignment import ValidationError, _validate_and_resolve
from app.services.scoping import is_faculty_scoped

#: Manba sifatida olinadigan holatlar — bekor qilinganlar ko'chirilmaydi
SOURCE_STATUSES = (AssignmentStatus.DRAFT, AssignmentStatus.ACTIVE, AssignmentStatus.COMPLETED)
#: Ommaviy tahrirlash faqat faol (yakunlanmagan) biriktirishlar uchun
EDITABLE_STATUSES = (AssignmentStatus.DRAFT, AssignmentStatus.ACTIVE)

TOO_MANY = f"Bir so'rovda ko'pi bilan {BULK_MAX} ta biriktirish — qamrovni toraytiring"


def _students_in_group(group_id: UUID) -> Any:
    return select(Student.id).where(Student.group_id == group_id)


def _students_in_faculty(faculty_id: UUID) -> Any:
    return (
        select(Student.id)
        .join(Group, Group.id == Student.group_id)
        .join(Direction, Direction.id == Group.direction_id)
        .where(Direction.faculty_id == faculty_id)
    )


def _apply_faculty_scope(stmt: Any, user: User) -> Any:
    """Fakultet admini faqat o'z fakulteti talabalarining biriktirishlarini ko'radi."""
    if is_faculty_scoped(user) and user.faculty_id:
        stmt = stmt.where(PracticeAssignment.student_id.in_(_students_in_faculty(user.faculty_id)))
    return stmt


async def _fetch_rows(db: AsyncSession, stmt: Any) -> list[dict[str, Any]]:
    stmt = stmt.order_by(Group.name, User.last_name, User.first_name).limit(BULK_MAX + 1)
    rows = [dict(r) for r in (await db.execute(stmt)).mappings().all()]
    if len(rows) > BULK_MAX:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, TOO_MANY)
    return await pa_svc._hydrate_reads(db, rows)


# ─── Qayta biriktirish ────────────────────────────────────


async def load_reassign_sources(
    db: AsyncSession, scope: ReassignScope, user: User
) -> list[dict[str, Any]]:
    stmt = pa_svc._base_read_select().where(
        PracticeAssignment.academic_year_id == scope.academic_year_id,
        PracticeAssignment.status.in_(SOURCE_STATUSES),
    )
    if scope.semester is not None:
        stmt = stmt.where(PracticeAssignment.semester == scope.semester)
    if scope.practice_type_id:
        stmt = stmt.where(PracticeAssignment.practice_type_id == scope.practice_type_id)
    if scope.assignment_ids:
        stmt = stmt.where(PracticeAssignment.id.in_(scope.assignment_ids))
    if scope.student_ids:
        stmt = stmt.where(PracticeAssignment.student_id.in_(scope.student_ids))
    if scope.group_id:
        stmt = stmt.where(PracticeAssignment.student_id.in_(_students_in_group(scope.group_id)))
    if scope.faculty_id:
        stmt = stmt.where(PracticeAssignment.student_id.in_(_students_in_faculty(scope.faculty_id)))
    stmt = _apply_faculty_scope(stmt, user)
    return await _fetch_rows(db, stmt)


async def reassign(
    db: AsyncSession, data: ReassignRequest, user: User
) -> tuple[ReassignResult, dict[str, Any]]:
    """Qaytaradi: (natija, audit metadata). dry_run=True — hech narsa yozilmaydi."""
    sources = await load_reassign_sources(db, data.source, user)
    target = data.target
    target_type: PracticeType | None = None
    if target.practice_type_id:
        target_type = await db.get(PracticeType, target.practice_type_id)
        if not target_type:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Amaliyot turi topilmadi")

    source_ids = {s["id"] for s in sources}
    items: list[ReassignItem] = []
    created_ids: list[UUID] = []
    now = datetime.now(UTC)

    try:
        for src in sources:
            type_id = target.practice_type_id or src["practice_type_id"]
            year_id = target.academic_year_id or src["academic_year_id"]
            weekdays = (
                target.required_weekdays
                if target.required_weekdays is not None
                else (src["required_weekdays"] if target.keep_weekdays else None)
            )
            item = ReassignItem(
                source_assignment_id=src["id"],
                student_id=src["student_id"],
                student_full_name=src["student_full_name"],
                student_hemis_id=src["student_hemis_id"],
                group_name=src.get("student_group_name"),
                object_name=src.get("organization_name") or src.get("area_name"),
                supervisor_full_name=src.get("supervisor_full_name"),
                source_practice_type_name=src["practice_type_name"],
                source_semester=src.get("semester"),
                source_start_date=src["start_date"],
                source_end_date=src["end_date"],
                source_status=str(src["status"].value),
                target_practice_type_name=(
                    target_type.name if target_type else src["practice_type_name"]
                ),
                target_semester=target.semester,
                target_required_weekdays=weekdays,
                ok=True,
            )
            try:
                resolved = await _validate_and_resolve(
                    db,
                    student_id=src["student_id"],
                    practice_type_id=type_id,
                    academic_year_id=year_id,
                    organization_id=src.get("organization_id"),
                    area_id=src.get("area_id"),
                    supervisor_id=src.get("supervisor_id"),
                    start_date=target.start_date,
                    end_date=target.end_date,
                    semester=target.semester,
                    exclude_capacity_ids=source_ids,
                )
            except ValidationError as e:
                item.ok = False
                item.error = str(e)
                items.append(item)
                continue

            if not data.dry_run:
                group = resolved["group"]
                assignment = PracticeAssignment(
                    student_id=src["student_id"],
                    practice_type_id=type_id,
                    academic_year_id=year_id,
                    organization_id=src.get("organization_id"),
                    area_id=src.get("area_id"),
                    supervisor_id=src.get("supervisor_id"),
                    start_date=target.start_date,
                    end_date=target.end_date,
                    semester=target.semester,
                    required_weekdays=weekdays,
                    group_id=group.id if group else None,
                    course=group.course if group else None,
                    status=AssignmentStatus.ACTIVE if target.activate else AssignmentStatus.DRAFT,
                    notes=target.notes,
                    source_assignment_id=src["id"],
                )
                try:
                    # Savepoint: DB darajasidagi xato (unique/check) faqat shu elementni yiqitadi
                    async with db.begin_nested():
                        db.add(assignment)
                        await db.flush()
                except Exception as e:  # noqa: BLE001
                    logger.warning(f"Qayta biriktirish elementi xato: {src['id']}: {e}")
                    item.ok = False
                    item.error = "Yozishda xatolik — ma'lumotlar bazasi rad etdi"
                    items.append(item)
                    continue
                item.new_assignment_id = assignment.id
                created_ids.append(assignment.id)
            items.append(item)

        if not data.dry_run and created_ids:
            await db.commit()
    except Exception:
        # Kutilmagan xato — hech narsa qisman qolmasin
        await db.rollback()
        raise

    ok_count = sum(1 for i in items if i.ok)
    result = ReassignResult(
        dry_run=data.dry_run,
        total=len(items),
        ok=ok_count,
        failed=len(items) - ok_count,
        created=len(created_ids),
        items=items,
        assignment_ids=created_ids,
    )
    audit_meta = {
        "affected_count": len(created_ids),
        "requested": len(items),
        "failed": len(items) - ok_count,
        "result": "ok" if ok_count == len(items) else "partial",
        "source": data.source.model_dump(),
        "target": target.model_dump(),
        "items": [
            {
                "source_assignment_id": i.source_assignment_id,
                "new_assignment_id": i.new_assignment_id,
                "student": i.student_full_name,
                "ok": i.ok,
                "error": i.error,
            }
            for i in items[:BULK_DETAIL_LIMIT]
        ],
        "truncated": len(items) > BULK_DETAIL_LIMIT,
        "started_at": now,
    }
    return result, _jsonable(audit_meta)


# ─── Ommaviy tahrirlash ───────────────────────────────────


async def load_bulk_targets(
    db: AsyncSession, data: AssignmentBulkUpdateRequest, user: User
) -> list[dict[str, Any]]:
    stmt = pa_svc._base_read_select().where(PracticeAssignment.status.in_(EDITABLE_STATUSES))
    if data.assignment_ids:
        stmt = stmt.where(PracticeAssignment.id.in_(data.assignment_ids))
    if data.group_id:
        stmt = stmt.where(PracticeAssignment.student_id.in_(_students_in_group(data.group_id)))
    if data.academic_year_id:
        stmt = stmt.where(PracticeAssignment.academic_year_id == data.academic_year_id)
    if data.semester is not None:
        stmt = stmt.where(PracticeAssignment.semester == data.semester)
    if data.practice_type_id:
        stmt = stmt.where(PracticeAssignment.practice_type_id == data.practice_type_id)
    stmt = _apply_faculty_scope(stmt, user)
    return await _fetch_rows(db, stmt)


def _changes_for(
    assignment: PracticeAssignment,
    payload: dict[str, Any],
    *,
    old_supervisor_name: str | None = None,
    new_supervisor_name: str | None = None,
) -> list[BulkChange]:
    out: list[BulkChange] = []
    for key, new in payload.items():
        old = getattr(assignment, key)
        if _jsonable(old) != _jsonable(new):
            change = BulkChange(field=key, before=_jsonable(old), after=_jsonable(new))
            if key == "supervisor_id":
                # UUID o'rniga F.I.SH. ko'rsatish uchun
                change.before_label = old_supervisor_name if old else None
                change.after_label = new_supervisor_name if new else None
            out.append(change)
    return out


async def bulk_update(
    db: AsyncSession, data: AssignmentBulkUpdateRequest, user: User
) -> tuple[BulkUpdateResult, dict[str, Any]]:
    """Qaytaradi: (natija, audit metadata). dry_run=True — hech narsa yozilmaydi."""
    rows = await load_bulk_targets(db, data, user)
    payload = data.changes.model_dump(exclude_unset=True)
    revalidate = {"supervisor_id", "start_date", "end_date"} & set(payload)
    sup_map: dict[UUID, str] = {}
    if "supervisor_id" in payload and payload["supervisor_id"]:
        sup_map = await pa_svc._load_supervisor_names(db, {payload["supervisor_id"]})

    items: list[BulkUpdateItem] = []
    updated_ids: list[UUID] = []
    contract_ids: list[UUID] = []
    unchanged = 0

    try:
        for row in rows:
            assignment = await db.get(PracticeAssignment, row["id"])
            if not assignment:
                continue
            new_sup = payload.get("supervisor_id")
            changes = _changes_for(
                assignment,
                payload,
                old_supervisor_name=row.get("supervisor_full_name"),
                new_supervisor_name=sup_map.get(new_sup) if new_sup else None,
            )
            item = BulkUpdateItem(
                assignment_id=assignment.id,
                student_full_name=row["student_full_name"],
                student_hemis_id=row["student_hemis_id"],
                group_name=row.get("student_group_name"),
                status=str(assignment.status.value),
                changes=changes,
                ok=True,
            )
            if not changes:
                unchanged += 1
                items.append(item)
                continue
            if revalidate:
                try:
                    await _validate_and_resolve(
                        db,
                        student_id=assignment.student_id,
                        practice_type_id=assignment.practice_type_id,
                        academic_year_id=assignment.academic_year_id,
                        organization_id=assignment.organization_id,
                        area_id=assignment.area_id,
                        supervisor_id=payload.get("supervisor_id", assignment.supervisor_id),
                        start_date=payload.get("start_date", assignment.start_date),
                        end_date=payload.get("end_date", assignment.end_date),
                        semester=assignment.semester,
                        exclude_assignment_id=assignment.id,
                    )
                except ValidationError as e:
                    item.ok = False
                    item.error = str(e)
                    items.append(item)
                    continue
            if not data.dry_run:
                for key, value in payload.items():
                    setattr(assignment, key, value)
                updated_ids.append(assignment.id)
                if revalidate:
                    contract_ids.append(assignment.id)
            items.append(item)

        if not data.dry_run and updated_ids:
            await db.commit()
    except Exception:
        await db.rollback()
        raise

    if not data.dry_run and contract_ids:
        # Supervizor/muddat o'zgarsa imzolanmagan shartnomalar qayta tuziladi (o'zi commit qiladi)
        await pa_svc.sync_assignments_to_contracts(db, contract_ids)

    ok_count = sum(1 for i in items if i.ok)
    result = BulkUpdateResult(
        dry_run=data.dry_run,
        total=len(items),
        ok=ok_count,
        failed=len(items) - ok_count,
        updated=len(updated_ids),
        unchanged=unchanged,
        items=items,
    )
    audit_meta = {
        "affected_count": len(updated_ids),
        "requested": len(items),
        "failed": len(items) - ok_count,
        "unchanged": unchanged,
        "result": "ok" if ok_count == len(items) else "partial",
        "scope": {
            "assignment_ids": data.assignment_ids,
            "group_id": data.group_id,
            "academic_year_id": data.academic_year_id,
            "semester": data.semester,
            "practice_type_id": data.practice_type_id,
        },
        "changes": [
            {
                "field": k,
                "after": v,
                "after_label": sup_map.get(v) if k == "supervisor_id" else None,
            }
            for k, v in payload.items()
        ],
        "items": [
            {
                "assignment_id": i.assignment_id,
                "student": i.student_full_name,
                "ok": i.ok,
                "error": i.error,
                "changes": [c.model_dump() for c in i.changes],
            }
            for i in items[:BULK_DETAIL_LIMIT]
        ],
        "truncated": len(items) > BULK_DETAIL_LIMIT,
    }
    return result, _jsonable(audit_meta)


async def count_sources(db: AsyncSession, scope: ReassignScope, user: User) -> int:
    """Oldindan ko'rish oynasi uchun tez hisob (to'liq ro'yxatsiz)."""
    stmt = select(func.count(PracticeAssignment.id)).where(
        PracticeAssignment.academic_year_id == scope.academic_year_id,
        PracticeAssignment.status.in_(SOURCE_STATUSES),
    )
    if scope.semester is not None:
        stmt = stmt.where(PracticeAssignment.semester == scope.semester)
    if scope.practice_type_id:
        stmt = stmt.where(PracticeAssignment.practice_type_id == scope.practice_type_id)
    if scope.assignment_ids:
        stmt = stmt.where(PracticeAssignment.id.in_(scope.assignment_ids))
    if scope.student_ids:
        stmt = stmt.where(PracticeAssignment.student_id.in_(scope.student_ids))
    if scope.group_id:
        stmt = stmt.where(PracticeAssignment.student_id.in_(_students_in_group(scope.group_id)))
    if scope.faculty_id:
        stmt = stmt.where(PracticeAssignment.student_id.in_(_students_in_faculty(scope.faculty_id)))
    stmt = _apply_faculty_scope(stmt, user)
    return int((await db.execute(stmt)).scalar_one())


__all__ = [
    "Semester",
    "bulk_update",
    "count_sources",
    "load_bulk_targets",
    "load_reassign_sources",
    "reassign",
]
