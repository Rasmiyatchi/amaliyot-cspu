"""PracticeType CRUD service."""

from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.practice_type import PracticeType


async def list_practice_types(
    db: AsyncSession, include_inactive: bool = False
) -> list[PracticeType]:
    stmt = select(PracticeType).order_by(PracticeType.display_order, PracticeType.name)
    if not include_inactive:
        stmt = stmt.where(PracticeType.is_active.is_(True))
    return list((await db.execute(stmt)).scalars().all())


async def get_practice_type(db: AsyncSession, id_: UUID) -> PracticeType:
    pt = await db.get(PracticeType, id_)
    if not pt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Amaliyot turi topilmadi: {id_}")
    return pt


async def create_practice_type(db: AsyncSession, data: BaseModel) -> PracticeType:
    payload = data.model_dump(exclude_unset=True)
    if payload.get("max_weeks", 1) < payload.get("min_weeks", 1):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "max_weeks min_weeks dan kichik bo'lishi mumkin emas",
        )
    pt = PracticeType(**payload)
    db.add(pt)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Shu kodli amaliyot turi mavjud") from e
    await db.refresh(pt)
    return pt


async def update_practice_type(db: AsyncSession, id_: UUID, data: BaseModel) -> PracticeType:
    pt = await get_practice_type(db, id_)
    payload = data.model_dump(exclude_unset=True)

    # Min/max tekshirish
    min_w = payload.get("min_weeks", pt.min_weeks)
    max_w = payload.get("max_weeks", pt.max_weeks)
    if max_w < min_w:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "max_weeks min_weeks dan kichik bo'lishi mumkin emas",
        )

    for key, value in payload.items():
        setattr(pt, key, value)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "O'zgartirish mos emas") from e
    await db.refresh(pt)
    return pt


async def delete_practice_type(db: AsyncSession, id_: UUID) -> None:
    pt = await get_practice_type(db, id_)
    try:
        await db.delete(pt)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Ushbu amaliyot turiga bog'langan yozuvlar bor — is_active=false qiling",
        ) from e
