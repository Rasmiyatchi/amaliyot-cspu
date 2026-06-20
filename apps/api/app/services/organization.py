"""Organization CRUD service."""

from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import OrganizationKind
from app.models.organization import Organization


async def list_organizations(
    db: AsyncSession,
    offset: int,
    limit: int,
    search: str | None = None,
    kind: OrganizationKind | None = None,
    region: str | None = None,
    is_active: bool | None = None,
) -> tuple[list[Organization], int]:
    base = select(Organization)
    count_stmt = select(func.count(Organization.id))

    def apply(stmt):  # type: ignore[no-untyped-def]
        if search:
            like = f"%{search.lower()}%"
            stmt = stmt.where(
                func.lower(Organization.name).like(like)
                | func.lower(Organization.director_full_name).like(like)
            )
        if kind:
            stmt = stmt.where(Organization.kind == kind)
        if region:
            stmt = stmt.where(func.lower(Organization.region).like(f"%{region.lower()}%"))
        if is_active is not None:
            stmt = stmt.where(Organization.is_active.is_(is_active))
        return stmt

    base = apply(base)  # type: ignore[no-untyped-call]
    count_stmt = apply(count_stmt)  # type: ignore[no-untyped-call]

    total = (await db.execute(count_stmt)).scalar_one()
    items = (
        (await db.execute(base.order_by(Organization.name).offset(offset).limit(limit)))
        .scalars()
        .all()
    )
    return list(items), total


async def get_organization(db: AsyncSession, id_: UUID) -> Organization:
    org = await db.get(Organization, id_)
    if not org:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Tashkilot topilmadi: {id_}")
    return org


async def create_organization(db: AsyncSession, data: BaseModel) -> Organization:
    org = Organization(**data.model_dump(exclude_unset=True))
    db.add(org)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Tashkilot yaratishda xatolik (takroriy qiymat)"
        ) from e
    await db.refresh(org)
    return org


async def update_organization(db: AsyncSession, id_: UUID, data: BaseModel) -> Organization:
    org = await get_organization(db, id_)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(org, key, value)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "O'zgartirish mos emas") from e
    await db.refresh(org)
    return org


async def delete_organization(db: AsyncSession, id_: UUID) -> None:
    org = await get_organization(db, id_)
    try:
        await db.delete(org)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Bog'langan supervizorlar yoki amaliyotlar bor — is_active=false qiling",
        ) from e
