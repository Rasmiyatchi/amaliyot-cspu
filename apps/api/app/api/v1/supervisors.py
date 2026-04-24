"""Supervisors endpoints — User + profile birgalikda."""

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import RequireAdmin
from app.db.session import SessionDep
from app.schemas.common import CredentialsUpdate, Paginated
from app.schemas.supervisor import SupervisorCreate, SupervisorRead, SupervisorUpdate
from app.services import supervisor as svc

router = APIRouter(prefix="/supervisors", tags=["supervisors"])


@router.get("", response_model=Paginated[SupervisorRead])
async def list_supervisors(
    db: SessionDep,
    _: RequireAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    organization_id: UUID | None = None,
    search: str | None = Query(None, min_length=1, max_length=100),
    is_active: bool | None = None,
) -> Paginated[SupervisorRead]:
    offset = (page - 1) * page_size
    items, total = await svc.list_supervisors(
        db, offset, page_size, organization_id, search, is_active
    )
    return Paginated(
        items=[SupervisorRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{id_}", response_model=SupervisorRead)
async def get_supervisor(id_: UUID, db: SessionDep, _: RequireAdmin) -> SupervisorRead:
    return SupervisorRead.model_validate(await svc.get_supervisor(db, id_))


@router.post("", response_model=SupervisorRead, status_code=status.HTTP_201_CREATED)
async def create_supervisor(
    data: SupervisorCreate, db: SessionDep, _: RequireAdmin
) -> SupervisorRead:
    return SupervisorRead.model_validate(await svc.create_supervisor(db, data))


@router.patch("/{id_}", response_model=SupervisorRead)
async def update_supervisor(
    id_: UUID, data: SupervisorUpdate, db: SessionDep, _: RequireAdmin
) -> SupervisorRead:
    return SupervisorRead.model_validate(await svc.update_supervisor(db, id_, data))


@router.patch(
    "/{id_}/credentials",
    response_model=SupervisorRead,
    summary="Admin: supervizor login/parolini yangilash",
)
async def update_supervisor_credentials(
    id_: UUID, data: CredentialsUpdate, db: SessionDep, _: RequireAdmin
) -> SupervisorRead:
    return SupervisorRead.model_validate(await svc.update_credentials(db, id_, data))


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supervisor(id_: UUID, db: SessionDep, _: RequireAdmin) -> None:
    await svc.delete_supervisor(db, id_)
