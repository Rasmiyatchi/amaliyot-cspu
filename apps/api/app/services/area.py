"""Area CRUD service."""

from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.area import Area


async def list_areas(
    db: AsyncSession,
    offset: int,
    limit: int,
    search: str | None = None,
    region: str | None = None,
    is_active: bool | None = None,
) -> tuple[list[Area], int]:
    base = select(Area)
    count_stmt = select(func.count(Area.id))

    def apply(stmt):  # type: ignore[no-untyped-def]
        if search:
            stmt = stmt.where(func.lower(Area.name).like(f"%{search.lower()}%"))
        if region:
            stmt = stmt.where(Area.region == region)
        if is_active is not None:
            stmt = stmt.where(Area.is_active.is_(is_active))
        return stmt

    base = apply(base)  # type: ignore[no-untyped-call]
    count_stmt = apply(count_stmt)  # type: ignore[no-untyped-call]

    total = (await db.execute(count_stmt)).scalar_one()
    items = (await db.execute(base.order_by(Area.name).offset(offset).limit(limit))).scalars().all()
    return list(items), total


async def get_area(db: AsyncSession, id_: UUID) -> Area:
    area = await db.get(Area, id_)
    if not area:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Hudud topilmadi: {id_}")
    return area


async def create_area(db: AsyncSession, data: BaseModel) -> Area:
    area = Area(**data.model_dump(exclude_unset=True))
    db.add(area)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Shu nomli hudud mavjud") from e
    await db.refresh(area)
    return area


async def update_area(db: AsyncSession, id_: UUID, data: BaseModel) -> Area:
    area = await get_area(db, id_)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(area, key, value)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Shu nomli hudud mavjud") from e
    await db.refresh(area)
    return area


async def delete_area(db: AsyncSession, id_: UUID) -> None:
    area = await get_area(db, id_)
    try:
        await db.delete(area)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Hududga bog'langan amaliyotlar bor") from e
