"""Practice assignments endpoints."""

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import RequireAdmin
from app.db.session import SessionDep
from app.models.enums import AssignmentStatus
from app.schemas.common import Paginated
from app.schemas.practice_assignment import (
    BulkAssignmentResult,
    PracticeAssignmentBulkCreate,
    PracticeAssignmentCreate,
    PracticeAssignmentRead,
    PracticeAssignmentUpdate,
)
from app.services import practice_assignment as svc

router = APIRouter(prefix="/practice-assignments", tags=["practice-assignments"])


@router.get("", response_model=Paginated[PracticeAssignmentRead])
async def list_assignments(
    db: SessionDep,
    _: RequireAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    student_id: UUID | None = None,
    practice_type_id: UUID | None = None,
    academic_year_id: UUID | None = None,
    organization_id: UUID | None = None,
    area_id: UUID | None = None,
    supervisor_id: UUID | None = None,
    status_filter: AssignmentStatus | None = Query(None, alias="status"),
    search: str | None = Query(None, min_length=1, max_length=100),
) -> Paginated[PracticeAssignmentRead]:
    offset = (page - 1) * page_size
    items, total = await svc.list_assignments(
        db,
        offset,
        page_size,
        student_id=student_id,
        practice_type_id=practice_type_id,
        academic_year_id=academic_year_id,
        organization_id=organization_id,
        area_id=area_id,
        supervisor_id=supervisor_id,
        status_filter=status_filter,
        search=search,
    )
    return Paginated(
        items=[PracticeAssignmentRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{id_}", response_model=PracticeAssignmentRead)
async def get_assignment(id_: UUID, db: SessionDep, _: RequireAdmin) -> PracticeAssignmentRead:
    return PracticeAssignmentRead.model_validate(await svc.get_assignment(db, id_))


@router.post(
    "",
    response_model=PracticeAssignmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Yangi biriktirish (bitta talaba)",
)
async def create_assignment(
    data: PracticeAssignmentCreate, db: SessionDep, _: RequireAdmin
) -> PracticeAssignmentRead:
    return PracticeAssignmentRead.model_validate(await svc.create_assignment(db, data))


@router.post(
    "/bulk",
    response_model=BulkAssignmentResult,
    status_code=status.HTTP_201_CREATED,
    summary="Ko'p talabani bir amaliyotga biriktirish (guruh)",
)
async def bulk_create(
    data: PracticeAssignmentBulkCreate, db: SessionDep, _: RequireAdmin
) -> BulkAssignmentResult:
    return await svc.bulk_create_assignments(db, data)


@router.patch("/{id_}", response_model=PracticeAssignmentRead)
async def update_assignment(
    id_: UUID,
    data: PracticeAssignmentUpdate,
    db: SessionDep,
    _: RequireAdmin,
) -> PracticeAssignmentRead:
    return PracticeAssignmentRead.model_validate(await svc.update_assignment(db, id_, data))


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(id_: UUID, db: SessionDep, _: RequireAdmin) -> None:
    await svc.delete_assignment(db, id_)
