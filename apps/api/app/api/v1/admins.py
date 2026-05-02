"""Admins endpoints — admin va super_admin foydalanuvchilarni boshqarish.

Hammasi faqat super_admin tomonidan chaqirilishi mumkin.
"""

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import RequireSuperAdmin
from app.db.session import SessionDep
from app.schemas.admin import AdminCreate, AdminRead, AdminUpdate
from app.schemas.common import CredentialsUpdate, Paginated
from app.services import admin as svc

router = APIRouter(prefix="/admins", tags=["admins"])


@router.get("", response_model=Paginated[AdminRead])
async def list_admins(
    db: SessionDep,
    user: RequireSuperAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=100),
    is_active: bool | None = None,
) -> Paginated[AdminRead]:
    offset = (page - 1) * page_size
    items, total = await svc.list_admins(
        db, offset=offset, limit=page_size, search=search, is_active=is_active
    )
    return Paginated(
        items=[AdminRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{admin_id}", response_model=AdminRead)
async def get_admin(
    admin_id: UUID, db: SessionDep, user: RequireSuperAdmin
) -> AdminRead:
    return AdminRead.model_validate(await svc.get_admin(db, admin_id))


@router.post("", response_model=AdminRead, status_code=status.HTTP_201_CREATED)
async def create_admin(
    data: AdminCreate, db: SessionDep, user: RequireSuperAdmin
) -> AdminRead:
    return AdminRead.model_validate(await svc.create_admin(db, data))


@router.patch("/{admin_id}", response_model=AdminRead)
async def update_admin(
    admin_id: UUID,
    data: AdminUpdate,
    db: SessionDep,
    user: RequireSuperAdmin,
) -> AdminRead:
    return AdminRead.model_validate(await svc.update_admin(db, admin_id, data))


@router.patch("/{admin_id}/credentials", response_model=AdminRead)
async def update_admin_credentials(
    admin_id: UUID,
    data: CredentialsUpdate,
    db: SessionDep,
    user: RequireSuperAdmin,
) -> AdminRead:
    return AdminRead.model_validate(await svc.update_credentials(db, admin_id, data))


@router.delete("/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin(
    admin_id: UUID, db: SessionDep, user: RequireSuperAdmin
) -> None:
    await svc.delete_admin(db, admin_id, user.id)
