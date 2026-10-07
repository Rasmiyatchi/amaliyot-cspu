"""Kirish cheklovlari — bitta foydalanuvchi yoki butun guruh uchun tizimni vaqtincha yopish.

Tekshiruv har bir autentifikatsiyalangan so'rovda (`get_current_user`) va login paytida
bajariladi. Bitta uvicorn worker — natija qisqa muddatga (CACHE_TTL) xotirada saqlanadi,
cheklov yaratilganda/o'chirilganda kesh tozalanadi.
"""

import time
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.academic import Direction, Group
from app.models.access_restriction import AccessRestriction
from app.models.enums import RestrictionMode, RestrictionTarget, UserRole
from app.models.student import Student
from app.models.supervisor import Supervisor
from app.models.user import User

CACHE_TTL_SECONDS = 15.0
_cache: dict[UUID, tuple[float, dict[str, Any] | None]] = {}


class AccessRestrictedError(Exception):
    """Cheklangan foydalanuvchi — 423 Locked + ekran rejimi (app/main.py handler)."""

    def __init__(self, restriction: dict[str, Any]) -> None:
        super().__init__("access restricted")
        self.restriction = restriction


DETAIL_BY_MODE = {
    RestrictionMode.MAINTENANCE: (
        "Texnik ishlar olib borilmoqda. Birozdan so'ng qayta urinib ko'ring"
    ),
    RestrictionMode.RESTRICTED: "Sizga tizimga kirish vaqtincha cheklangan",
}


def invalidate_cache() -> None:
    _cache.clear()


def _effective_clause() -> Any:
    now = datetime.now(UTC)
    return (
        AccessRestriction.is_active.is_(True),
        or_(AccessRestriction.ends_at.is_(None), AccessRestriction.ends_at > now),
    )


def _public(r: AccessRestriction) -> dict[str, Any]:
    return {
        "mode": r.mode,
        "message": r.message,
        "ends_at": r.ends_at,
    }


async def find_active_for_user(db: AsyncSession, user: User) -> dict[str, Any] | None:
    """Foydalanuvchiga tegishli (shaxsan yoki guruhi orqali) amaldagi cheklov."""
    if user.role == UserRole.SUPER_ADMIN:
        return None
    cached = _cache.get(user.id)
    now_ts = time.monotonic()
    if cached and now_ts - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    group_subq = select(Student.group_id).where(Student.user_id == user.id).scalar_subquery()
    row = (
        await db.execute(
            select(AccessRestriction)
            .where(
                *_effective_clause(),
                or_(
                    AccessRestriction.user_id == user.id,
                    AccessRestriction.group_id == group_subq,
                ),
            )
            # Shaxsiy cheklov guruhnikidan ustun
            .order_by(
                (AccessRestriction.target_type == RestrictionTarget.USER).desc(),
                AccessRestriction.created_at.desc(),
            )
            .limit(1)
        )
    ).scalar_one_or_none()
    result = _public(row) if row else None
    _cache[user.id] = (now_ts, result)
    return result


async def raise_if_restricted(db: AsyncSession, user: User) -> None:
    restriction = await find_active_for_user(db, user)
    if restriction:
        raise AccessRestrictedError(restriction)


# ─── Admin boshqaruvi ───────────────────────────────────────────────────────


def _to_read(
    r: AccessRestriction,
    *,
    target_name: str | None,
    target_detail: str | None,
    affected_count: int | None,
    created_by_name: str | None,
) -> dict[str, Any]:
    now = datetime.now(UTC)
    return {
        "id": r.id,
        "target_type": r.target_type,
        "user_id": r.user_id,
        "group_id": r.group_id,
        "target_name": target_name,
        "target_detail": target_detail,
        "affected_count": affected_count,
        "mode": r.mode,
        "message": r.message,
        "note": r.note,
        "ends_at": r.ends_at,
        "is_active": r.is_active,
        "is_effective": bool(r.is_active and (r.ends_at is None or r.ends_at > now)),
        "created_by_name": created_by_name,
        "created_at": r.created_at,
    }


async def list_restrictions(
    db: AsyncSession, *, effective_only: bool = False
) -> list[dict[str, Any]]:
    target_user = aliased(User)
    creator = aliased(User)
    student_count = (
        select(func.count(Student.id))
        .where(Student.group_id == AccessRestriction.group_id)
        .correlate(AccessRestriction)
        .scalar_subquery()
    )
    stmt = (
        select(
            AccessRestriction,
            target_user.last_name,
            target_user.first_name,
            target_user.username,
            Group.name.label("group_name"),
            Direction.name.label("direction_name"),
            student_count.label("affected_count"),
            creator.last_name.label("creator_last"),
            creator.first_name.label("creator_first"),
        )
        .outerjoin(target_user, target_user.id == AccessRestriction.user_id)
        .outerjoin(Group, Group.id == AccessRestriction.group_id)
        .outerjoin(Direction, Direction.id == Group.direction_id)
        .outerjoin(creator, creator.id == AccessRestriction.created_by_id)
        .order_by(AccessRestriction.created_at.desc())
    )
    if effective_only:
        stmt = stmt.where(*_effective_clause())
    rows = (await db.execute(stmt)).all()
    out = []
    for row in rows:
        r: AccessRestriction = row[0]
        if r.target_type == RestrictionTarget.USER:
            name = " ".join(p for p in (row.last_name, row.first_name) if p) or None
            detail = row.username
            affected = 1
        else:
            name = row.group_name
            detail = row.direction_name
            affected = int(row.affected_count or 0)
        creator_name = " ".join(p for p in (row.creator_last, row.creator_first) if p) or None
        out.append(
            _to_read(
                r,
                target_name=name,
                target_detail=detail,
                affected_count=affected,
                created_by_name=creator_name,
            )
        )
    return out


async def create_restriction(db: AsyncSession, data: dict[str, Any], actor: User) -> dict[str, Any]:
    target_type = data["target_type"]
    if target_type == RestrictionTarget.USER:
        user_id = data.get("user_id")
        if not user_id and data.get("student_id"):
            user_id = (
                await db.execute(select(Student.user_id).where(Student.id == data["student_id"]))
            ).scalar_one_or_none()
        if not user_id and data.get("supervisor_id"):
            user_id = (
                await db.execute(
                    select(Supervisor.user_id).where(Supervisor.id == data["supervisor_id"])
                )
            ).scalar_one_or_none()
        target = await db.get(User, user_id) if user_id else None
        if not target:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User topilmadi")
        data["user_id"] = target.id
        if target.role == UserRole.SUPER_ADMIN:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Super admin uchun kirish cheklovi qo'yib bo'lmaydi"
            )
        if target.id == actor.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "O'zingizni cheklab bo'lmaydi")
        data["group_id"] = None
    else:
        if not await db.get(Group, data["group_id"]):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Guruh topilmadi")
        data["user_id"] = None

    ends_at = data.get("ends_at")
    if ends_at is not None and ends_at <= datetime.now(UTC):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Tugash vaqti hozirgi vaqtdan keyin bo'lishi kerak"
        )

    r = AccessRestriction(
        target_type=target_type,
        user_id=data.get("user_id"),
        group_id=data.get("group_id"),
        mode=data.get("mode") or RestrictionMode.RESTRICTED,
        message=(data.get("message") or "").strip() or None,
        note=(data.get("note") or "").strip() or None,
        ends_at=ends_at,
        is_active=True,
        created_by_id=actor.id,
    )
    db.add(r)
    await db.flush()
    invalidate_cache()
    rows = await list_restrictions(db)
    return next(x for x in rows if x["id"] == r.id)


async def deactivate_restriction(db: AsyncSession, id_: UUID) -> dict[str, Any]:
    r = await db.get(AccessRestriction, id_)
    if not r:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cheklov topilmadi")
    r.is_active = False
    await db.flush()
    invalidate_cache()
    rows = await list_restrictions(db)
    return next(x for x in rows if x["id"] == r.id)


async def delete_restriction(db: AsyncSession, id_: UUID) -> dict[str, Any]:
    r = await db.get(AccessRestriction, id_)
    if not r:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cheklov topilmadi")
    snapshot = {
        "target_type": r.target_type.value,
        "user_id": str(r.user_id) if r.user_id else None,
        "group_id": str(r.group_id) if r.group_id else None,
        "mode": r.mode.value,
    }
    await db.delete(r)
    await db.flush()
    invalidate_cache()
    return snapshot
