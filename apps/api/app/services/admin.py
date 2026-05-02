"""Admin service — admin va super_admin foydalanuvchilar CRUD.

Faqat super_admin chaqira oladi (RBAC endpoint'da).
"""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User


def _to_dict(u: User) -> dict[str, Any]:
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "phone": u.phone,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "middle_name": u.middle_name,
        "full_name": u.full_name,
        "role": u.role,
        "is_active": u.is_active,
        "last_login_at": u.last_login_at,
        "created_at": u.created_at,
    }


async def list_admins(
    db: AsyncSession,
    *,
    offset: int = 0,
    limit: int = 50,
    search: str | None = None,
    is_active: bool | None = None,
) -> tuple[list[dict[str, Any]], int]:
    base = select(User).where(User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
    count_stmt = select(func.count(User.id)).where(
        User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN])
    )

    if search:
        like = f"%{search.lower()}%"
        cond = or_(
            func.lower(User.username).like(like),
            func.lower(User.first_name).like(like),
            func.lower(User.last_name).like(like),
        )
        base = base.where(cond)
        count_stmt = count_stmt.where(cond)

    if is_active is not None:
        base = base.where(User.is_active.is_(is_active))
        count_stmt = count_stmt.where(User.is_active.is_(is_active))

    total = (await db.execute(count_stmt)).scalar_one()
    rows = (
        (
            await db.execute(
                base.order_by(User.role, User.last_name, User.first_name)
                .offset(offset)
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return [_to_dict(u) for u in rows], total


async def get_admin(db: AsyncSession, admin_id: UUID) -> dict[str, Any]:
    user = await db.get(User, admin_id)
    if not user or user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admin topilmadi")
    return _to_dict(user)


async def create_admin(db: AsyncSession, data: BaseModel) -> dict[str, Any]:
    payload = data.model_dump()
    role = payload.get("role") or UserRole.ADMIN
    if role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Faqat 'admin' yoki 'super_admin' rol qo'llab-quvvatlanadi"
        )

    user = User(
        username=payload["username"],
        password_hash=hash_password(payload["password"]),
        email=payload.get("email") or None,
        phone=payload.get("phone") or None,
        first_name=payload["first_name"],
        last_name=payload["last_name"],
        middle_name=payload.get("middle_name") or None,
        role=role,
        is_active=True,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Bu username yoki email allaqachon mavjud",
        ) from e
    await db.refresh(user)
    return _to_dict(user)


async def update_admin(
    db: AsyncSession, admin_id: UUID, data: BaseModel
) -> dict[str, Any]:
    user = await db.get(User, admin_id)
    if not user or user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admin topilmadi")

    payload = data.model_dump(exclude_unset=True)
    if "role" in payload and payload["role"] not in (
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Rolni faqat admin/super_admin oralig'ida o'zgartirish mumkin",
        )

    for key, value in payload.items():
        setattr(user, key, value)

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email band") from e
    await db.refresh(user)
    return _to_dict(user)


async def delete_admin(
    db: AsyncSession, admin_id: UUID, current_user_id: UUID
) -> None:
    user = await db.get(User, admin_id)
    if not user or user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admin topilmadi")

    if user.id == current_user_id:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "O'zingizni o'chirib bo'lmaydi"
        )

    # Oxirgi super_admin'ni o'chirish bo'lmasin
    if user.role == UserRole.SUPER_ADMIN:
        remaining = (
            await db.execute(
                select(func.count(User.id)).where(
                    User.role == UserRole.SUPER_ADMIN, User.id != user.id
                )
            )
        ).scalar_one()
        if remaining == 0:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Tizimda kamida bitta super admin qolishi kerak",
            )

    await db.delete(user)
    await db.commit()


async def update_credentials(
    db: AsyncSession, admin_id: UUID, data: BaseModel
) -> dict[str, Any]:
    """Username va/yoki password yangilash (super admin only)."""
    user = await db.get(User, admin_id)
    if not user or user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admin topilmadi")

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
        raise HTTPException(status.HTTP_409_CONFLICT, "Bu username band") from e
    await db.refresh(user)
    return _to_dict(user)
