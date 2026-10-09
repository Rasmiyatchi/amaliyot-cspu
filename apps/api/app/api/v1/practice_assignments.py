"""Practice assignments endpoints."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Query, Request, status

from app.api.deps import CurrentUser, RequirePractice, RequirePracticeOrContracts
from app.db.session import SessionDep
from app.models.enums import AssignmentStatus, Semester, UserRole
from app.schemas.assignment_bulk import (
    AssignmentBulkUpdateRequest,
    BulkUpdateResult,
    ReassignRequest,
    ReassignResult,
)
from app.schemas.common import Paginated
from app.schemas.practice_assignment import (
    BulkAssignmentResult,
    PracticeAssignmentBulkCreate,
    PracticeAssignmentCreate,
    PracticeAssignmentRead,
    PracticeAssignmentUpdate,
)
from app.services import assignment_bulk as bulk_svc
from app.services import audit_log as audit
from app.services import practice_assignment as svc
from app.services.scoping import assert_assignment_access, assert_students_in_scope

router = APIRouter(prefix="/practice-assignments", tags=["practice-assignments"])


def _label(a: dict[str, Any]) -> str:
    return f"{a['student_full_name']} · {a['practice_type_name']}"


@router.get("", response_model=Paginated[PracticeAssignmentRead])
async def list_assignments(
    db: SessionDep,
    # Shartnoma formasi ("biriktirishlar" rejimi) ham shu ro'yxatni o'qiydi
    user: RequirePracticeOrContracts,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    student_id: UUID | None = None,
    practice_type_id: UUID | None = None,
    academic_year_id: UUID | None = None,
    semester: Semester | None = None,
    organization_id: UUID | None = None,
    area_id: UUID | None = None,
    supervisor_id: UUID | None = None,
    direction_id: UUID | None = None,
    course: int | None = Query(None, ge=1, le=5),
    group_id: UUID | None = None,
    status_filter: AssignmentStatus | None = Query(None, alias="status"),
    search: str | None = Query(None, min_length=1, max_length=100),
    faculty_id: UUID | None = None,
) -> Paginated[PracticeAssignmentRead]:
    if user.role == UserRole.ADMIN and user.faculty_id:
        faculty_id = user.faculty_id
    offset = (page - 1) * page_size
    items, total = await svc.list_assignments(
        db,
        offset,
        page_size,
        student_id=student_id,
        practice_type_id=practice_type_id,
        academic_year_id=academic_year_id,
        semester=semester,
        organization_id=organization_id,
        area_id=area_id,
        supervisor_id=supervisor_id,
        direction_id=direction_id,
        course=course,
        group_id=group_id,
        status_filter=status_filter,
        search=search,
        faculty_id=faculty_id,
    )
    return Paginated(
        items=[PracticeAssignmentRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/my",
    response_model=list[PracticeAssignmentRead],
    summary="Joriy foydalanuvchiga tegishli biriktirishlar",
)
async def my_assignments(
    db: SessionDep,
    user: CurrentUser,
    academic_year_id: str | None = None,
    semester: Semester | None = None,
) -> list[PracticeAssignmentRead]:
    items = await svc.list_my_assignments(
        db, user, academic_year_id=academic_year_id, semester=semester
    )
    return [PracticeAssignmentRead.model_validate(i) for i in items]


@router.post(
    "/reassign",
    response_model=ReassignResult,
    summary="Qayta biriktirish: 1-semestr biriktirishlarini yangi davrga ko'chirish",
)
async def reassign_assignments(
    data: ReassignRequest, request: Request, db: SessionDep, user: RequirePractice
) -> ReassignResult:
    """`dry_run=true` — oldindan ko'rish (hech narsa yozilmaydi). Obyekt va supervizor
    manbadan saqlanadi; faqat tur, semestr, sanalar, majburiy kunlar o'zgaradi.
    Manba (eski semestr) yozuvlari va tarixi o'chirilmaydi."""
    result, meta = await bulk_svc.reassign(db, data, user)
    if not data.dry_run:
        t = data.target
        sem = f" {t.semester.value}" if t.semester else ""
        await audit.log(
            db,
            actor=user,
            action="reassign",
            entity_type="practice_assignment",
            entity_id=None,
            summary=(
                f"Qayta biriktirish: {result.created}/{result.total} ta talaba →"
                f"{sem} {t.start_date} – {t.end_date}"
            ),
            metadata=meta,
            request=request,
        )
        await db.commit()
    return result


@router.post(
    "/bulk-update",
    response_model=BulkUpdateResult,
    summary="Ommaviy tahrirlash: majburiy kunlar, supervizor, sanalar",
)
async def bulk_update_assignments(
    data: AssignmentBulkUpdateRequest, request: Request, db: SessionDep, user: RequirePractice
) -> BulkUpdateResult:
    """`dry_run=true` — oldindan ko'rish. Faqat faol (draft/active) biriktirishlar.
    Davomat va hisobot ma'lumotlariga tegilmaydi."""
    result, meta = await bulk_svc.bulk_update(db, data, user)
    if not data.dry_run:
        fields = ", ".join(data.changes.model_fields_set)
        await audit.log(
            db,
            actor=user,
            action="bulk_update",
            entity_type="practice_assignment",
            entity_id=None,
            summary=(
                f"Biriktirishlar ommaviy tahrirlandi: {result.updated}/{result.total} ({fields})"
            ),
            metadata=meta,
            request=request,
        )
        await db.commit()
    return result


@router.get("/{id_}", response_model=PracticeAssignmentRead)
async def get_assignment(
    id_: UUID, db: SessionDep, user: RequirePractice
) -> PracticeAssignmentRead:
    await assert_assignment_access(db, user, id_)
    return PracticeAssignmentRead.model_validate(await svc.get_assignment(db, id_))


@router.post(
    "",
    response_model=PracticeAssignmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Yangi biriktirish (bitta talaba)",
)
async def create_assignment(
    data: PracticeAssignmentCreate, request: Request, db: SessionDep, user: RequirePractice
) -> PracticeAssignmentRead:
    await assert_students_in_scope(db, user, [data.student_id])
    created = await svc.create_assignment(db, data)
    await audit.log(
        db,
        actor=user,
        action="create",
        entity_type="practice_assignment",
        entity_id=created["id"],
        summary=f"Biriktirish yaratildi: {_label(created)}",
        metadata={"after": {k: created.get(k) for k in svc.AUDIT_FIELDS}},
        request=request,
    )
    await db.commit()
    return PracticeAssignmentRead.model_validate(created)


@router.post(
    "/bulk",
    response_model=BulkAssignmentResult,
    status_code=status.HTTP_201_CREATED,
    summary="Ko'p talabani bir amaliyotga biriktirish (guruh)",
)
async def bulk_create(
    data: PracticeAssignmentBulkCreate, request: Request, db: SessionDep, user: RequirePractice
) -> BulkAssignmentResult:
    await assert_students_in_scope(db, user, list(data.student_ids))
    result = await svc.bulk_create_assignments(db, data)
    await audit.log(
        db,
        actor=user,
        action="create",
        entity_type="practice_assignment",
        entity_id=None,
        summary=f"Ommaviy biriktirish: {result.created}/{result.requested} ta talaba",
        metadata={
            "affected_count": result.created,
            "requested": result.requested,
            "failed": len(result.failed),
            "result": "ok" if not result.failed else "partial",
            "assignment_ids": result.assignment_ids[: audit.BULK_DETAIL_LIMIT],
            "errors": [e.model_dump() for e in result.failed[: audit.BULK_DETAIL_LIMIT]],
            "params": data.model_dump(exclude={"student_ids"}),
        },
        request=request,
    )
    await db.commit()
    return result


@router.patch("/{id_}", response_model=PracticeAssignmentRead)
async def update_assignment(
    id_: UUID,
    data: PracticeAssignmentUpdate,
    request: Request,
    db: SessionDep,
    user: RequirePractice,
) -> PracticeAssignmentRead:
    await assert_assignment_access(db, user, id_)
    before: dict[str, Any] = {}
    updated = await svc.update_assignment(db, id_, data, before=before)
    changes = audit.diff(before, {k: updated.get(k) for k in svc.AUDIT_FIELDS})
    if changes:
        fields = ", ".join(c["field"] for c in changes)
        await audit.log(
            db,
            actor=user,
            action="update",
            entity_type="practice_assignment",
            entity_id=id_,
            summary=f"Biriktirish tahrirlandi: {_label(updated)} ({fields})",
            metadata={"changes": changes},
            request=request,
        )
        await db.commit()
    return PracticeAssignmentRead.model_validate(updated)


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    id_: UUID, request: Request, db: SessionDep, user: RequirePractice
) -> None:
    await assert_assignment_access(db, user, id_)
    existing = await svc.get_assignment(db, id_)
    snapshot = await svc.delete_assignment(db, id_)
    await audit.log(
        db,
        actor=user,
        action="delete",
        entity_type="practice_assignment",
        entity_id=id_,
        summary=f"Biriktirish o'chirildi: {_label(existing)}",
        metadata={"before": snapshot},
        request=request,
    )
    await db.commit()
