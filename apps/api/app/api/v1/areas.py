"""Areas endpoints."""

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import RequireAdmin
from app.db.session import SessionDep
from app.schemas.area import AreaCreate, AreaRead, AreaUpdate
from app.schemas.common import Paginated
from app.services import area as svc

router = APIRouter(prefix="/areas", tags=["areas"])


@router.get("", response_model=Paginated[AreaRead])
async def list_areas(
    db: SessionDep,
    _: RequireAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=100),
    region: str | None = None,
    is_active: bool | None = None,
) -> Paginated[AreaRead]:
    offset = (page - 1) * page_size
    items, total = await svc.list_areas(db, offset, page_size, search, region, is_active)
    return Paginated(
        items=[AreaRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{id_}", response_model=AreaRead)
async def get_area(id_: UUID, db: SessionDep, _: RequireAdmin) -> AreaRead:
    return AreaRead.model_validate(await svc.get_area(db, id_))


@router.post("", response_model=AreaRead, status_code=status.HTTP_201_CREATED)
async def create_area(data: AreaCreate, db: SessionDep, _: RequireAdmin) -> AreaRead:
    return AreaRead.model_validate(await svc.create_area(db, data))


@router.patch("/{id_}", response_model=AreaRead)
async def update_area(id_: UUID, data: AreaUpdate, db: SessionDep, _: RequireAdmin) -> AreaRead:
    return AreaRead.model_validate(await svc.update_area(db, id_, data))


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_area(id_: UUID, db: SessionDep, _: RequireAdmin) -> None:
    await svc.delete_area(db, id_)
