"""PracticeType endpoints.

- List/Get — barcha adminlar (RequireAdmin)
- Create/Update/Delete — faqat super_admin (reference data, ehtiyot bilan)
"""

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import RequireAdmin, RequireSuperAdmin
from app.db.session import SessionDep
from app.schemas.practice_type import (
    PracticeTypeCreate,
    PracticeTypeRead,
    PracticeTypeUpdate,
)
from app.services import practice_type as svc

router = APIRouter(prefix="/practice-types", tags=["practice-types"])


@router.get("", response_model=list[PracticeTypeRead])
async def list_practice_types(
    db: SessionDep,
    _: RequireAdmin,
    include_inactive: bool = Query(False, description="Deaktiv turlarni ham qaytaradi"),
) -> list[PracticeTypeRead]:
    items = await svc.list_practice_types(db, include_inactive)
    return [PracticeTypeRead.model_validate(i) for i in items]


@router.get("/{id_}", response_model=PracticeTypeRead)
async def get_practice_type(id_: UUID, db: SessionDep, _: RequireAdmin) -> PracticeTypeRead:
    return PracticeTypeRead.model_validate(await svc.get_practice_type(db, id_))


@router.post("", response_model=PracticeTypeRead, status_code=status.HTTP_201_CREATED)
async def create_practice_type(
    data: PracticeTypeCreate, db: SessionDep, _: RequireSuperAdmin
) -> PracticeTypeRead:
    return PracticeTypeRead.model_validate(await svc.create_practice_type(db, data))


@router.patch("/{id_}", response_model=PracticeTypeRead)
async def update_practice_type(
    id_: UUID, data: PracticeTypeUpdate, db: SessionDep, _: RequireSuperAdmin
) -> PracticeTypeRead:
    return PracticeTypeRead.model_validate(await svc.update_practice_type(db, id_, data))


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_practice_type(id_: UUID, db: SessionDep, _: RequireSuperAdmin) -> None:
    await svc.delete_practice_type(db, id_)
