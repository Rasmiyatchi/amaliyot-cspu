"""Supervisor CRUD service — User + profile birgalikda."""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.organization import Organization
from app.models.supervisor import Supervisor
from app.models.user import User


def _supervisor_base_select() -> Any:
    """Supervisor + User + Organization fields flat."""
    return (
        select(
            Supervisor.id,
            Supervisor.user_id,
            User.username,
            User.first_name,
            User.last_name,
            User.middle_name,
            User.email,
            User.phone,
            User.is_active,
            User.last_login_at,
            Supervisor.position,
            Supervisor.specialty,
            Supervisor.experience_years,
            Supervisor.capacity,
            Supervisor.rating,
            Supervisor.organization_id,
            Organization.name.label("organization_name"),
            Supervisor.created_at,
        )
        .join(User, User.id == Supervisor.user_id)
        .outerjoin(Organization, Organization.id == Supervisor.organization_id)
    )


def _row_to_dict(r: dict[str, Any]) -> dict[str, Any]:
    middle = r["middle_name"]
    full_name = f"{r['last_name']} {r['first_name']}" + (f" {middle}" if middle else "")
    return {**dict(r), "full_name": full_name}


async def list_supervisors(
    db: AsyncSession,
    offset: int,
    limit: int,
    organization_id: UUID | None = None,
    search: str | None = None,
    is_active: bool | None = None,
) -> tuple[list[dict[str, Any]], int]:
    base = _supervisor_base_select()
    count_stmt = (
        select(func.count(Supervisor.id))
        .select_from(Supervisor)
        .join(User, User.id == Supervisor.user_id)
    )

    def apply(stmt):  # type: ignore[no-untyped-def]
        if organization_id:
            stmt = stmt.where(Supervisor.organization_id == organization_id)
        if is_active is not None:
            stmt = stmt.where(User.is_active.is_(is_active))
        if search:
            like = f"%{search.lower()}%"
            stmt = stmt.where(
                func.lower(User.first_name).like(like)
                | func.lower(User.last_name).like(like)
                | User.username.like(f"%{search}%")
            )
        return stmt

    base = apply(base)  # type: ignore[no-untyped-call]
    count_stmt = apply(count_stmt)  # type: ignore[no-untyped-call]

    total = (await db.execute(count_stmt)).scalar_one()
    rows = (
        (
            await db.execute(
                base.order_by(User.last_name, User.first_name).offset(offset).limit(limit)
            )
        )
        .mappings()
        .all()
    )
    return [_row_to_dict(dict(r)) for r in rows], total


async def get_supervisor(db: AsyncSession, id_: UUID) -> dict[str, Any]:
    row = (
        (await db.execute(_supervisor_base_select().where(Supervisor.id == id_))).mappings().first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Supervizor topilmadi: {id_}")
    return _row_to_dict(dict(row))


async def create_supervisor(db: AsyncSession, data: BaseModel) -> dict[str, Any]:
    """User (role=supervisor) + Supervisor profile bir transactionda."""
    payload = data.model_dump(exclude_unset=True)

    # User yaratish
    user = User(
        username=payload["username"],
        password_hash=hash_password(payload["password"]),
        email=payload.get("email"),
        phone=payload.get("phone"),
        first_name=payload["first_name"],
        last_name=payload["last_name"],
        middle_name=payload.get("middle_name"),
        role=UserRole.SUPERVISOR,
        is_active=True,
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Shu username yoki email allaqachon mavjud",
        ) from e

    supervisor = Supervisor(
        user_id=user.id,
        position=payload["position"],
        specialty=payload.get("specialty"),
        experience_years=payload.get("experience_years"),
        organization_id=payload.get("organization_id"),
        capacity=payload.get("capacity", 5),
    )
    db.add(supervisor)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Tashkilot topilmadi yoki xatolik") from e

    return await get_supervisor(db, supervisor.id)


async def update_supervisor(db: AsyncSession, id_: UUID, data: BaseModel) -> dict[str, Any]:
    supervisor = await db.get(Supervisor, id_)
    if not supervisor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Supervizor topilmadi: {id_}")
    user = await db.get(User, supervisor.user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User topilmadi")

    payload = data.model_dump(exclude_unset=True)
    user_fields = {"email", "phone", "first_name", "last_name", "middle_name"}
    sup_fields = {
        "position",
        "specialty",
        "experience_years",
        "organization_id",
        "capacity",
        "is_active",
    }

    for key, value in payload.items():
        if key in user_fields:
            setattr(user, key, value)
        elif key == "is_active":
            user.is_active = value
            supervisor.is_active = value
        elif key in sup_fields:
            setattr(supervisor, key, value)

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "O'zgartirish mos emas") from e

    return await get_supervisor(db, supervisor.id)


async def update_credentials(
    db: AsyncSession, id_: UUID, data: BaseModel
) -> dict[str, Any]:
    """Admin orqali supervizor login/parolini yangilash."""
    supervisor = await db.get(Supervisor, id_)
    if not supervisor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Supervizor topilmadi: {id_}")
    user = await db.get(User, supervisor.user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foydalanuvchi topilmadi")

    payload = data.model_dump(exclude_unset=True)
    new_username = payload.get("username")
    new_password = payload.get("password")

    if not new_username and not new_password:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Kamida username yoki parolni kiriting",
        )

    if new_username and new_username != user.username:
        user.username = new_username
    if new_password:
        user.password_hash = hash_password(new_password)

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Bu username allaqachon band"
        ) from e

    return await get_supervisor(db, id_)


async def delete_supervisor(db: AsyncSession, id_: UUID) -> None:
    """Supervisor profile va bog'langan User'ni ham o'chiradi (CASCADE)."""
    supervisor = await db.get(Supervisor, id_)
    if not supervisor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Supervizor topilmadi: {id_}")
    user = await db.get(User, supervisor.user_id)
    try:
        if user:
            await db.delete(user)  # CASCADE Supervisor'ni ham o'chiradi
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Supervizorga bog'langan amaliyotlar bor — is_active=false qiling.",
        ) from e
