"""Organizations endpoints."""

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import RequireAdmin
from app.db.session import SessionDep
from app.models.enums import OrganizationKind
from app.schemas.common import Paginated
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationRead,
    OrganizationUpdate,
)
from app.services import organization as svc

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("", response_model=Paginated[OrganizationRead])
async def list_organizations(
    db: SessionDep,
    _: RequireAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=100),
    kind: OrganizationKind | None = None,
    region: str | None = None,
    is_active: bool | None = None,
) -> Paginated[OrganizationRead]:
    offset = (page - 1) * page_size
    items, total = await svc.list_organizations(
        db, offset, page_size, search, kind, region, is_active
    )
    return Paginated(
        items=[OrganizationRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{id_}", response_model=OrganizationRead)
async def get_organization(id_: UUID, db: SessionDep, _: RequireAdmin) -> OrganizationRead:
    return OrganizationRead.model_validate(await svc.get_organization(db, id_))


@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
async def create_organization(
    data: OrganizationCreate, db: SessionDep, _: RequireAdmin
) -> OrganizationRead:
    return OrganizationRead.model_validate(await svc.create_organization(db, data))


@router.patch("/{id_}", response_model=OrganizationRead)
async def update_organization(
    id_: UUID, data: OrganizationUpdate, db: SessionDep, _: RequireAdmin
) -> OrganizationRead:
    return OrganizationRead.model_validate(await svc.update_organization(db, id_, data))


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(id_: UUID, db: SessionDep, _: RequireAdmin) -> None:
    await svc.delete_organization(db, id_)
