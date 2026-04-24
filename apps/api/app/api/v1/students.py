"""Students endpoints — list + get by id (admin-only for Phase 2)."""

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import RequireAdmin
from app.db.session import SessionDep
from app.models.enums import StudentStatus
from app.schemas.common import CredentialsUpdate, Paginated
from app.schemas.student import StudentRead
from app.services.student import get_student as svc_get_student
from app.services.student import list_students as svc_list_students
from app.services.student import update_credentials as svc_update_credentials

router = APIRouter(prefix="/students", tags=["students"])


@router.get("", response_model=Paginated[StudentRead])
async def list_students(
    db: SessionDep,
    _: RequireAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    faculty_id: UUID | None = None,
    direction_id: UUID | None = None,
    group_id: UUID | None = None,
    course: int | None = Query(None, ge=1, le=4),
    status_filter: StudentStatus | None = Query(None, alias="status"),
    search: str | None = Query(None, min_length=1, max_length=100),
) -> Paginated[StudentRead]:
    offset = (page - 1) * page_size
    items, total = await svc_list_students(
        db,
        offset,
        page_size,
        faculty_id,
        direction_id,
        group_id,
        course,
        status_filter,
        search,
    )
    return Paginated(
        items=[StudentRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{id_}", response_model=StudentRead)
async def get_student(id_: UUID, db: SessionDep, _: RequireAdmin) -> StudentRead:
    return StudentRead.model_validate(await svc_get_student(db, id_))


@router.patch(
    "/{id_}/credentials",
    response_model=StudentRead,
    summary="Admin: talaba login/parolini yangilash",
)
async def update_student_credentials(
    id_: UUID, data: CredentialsUpdate, db: SessionDep, _: RequireAdmin
) -> StudentRead:
    return StudentRead.model_validate(await svc_update_credentials(db, id_, data))
