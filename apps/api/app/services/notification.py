"""Notification service — yaratish, ro'yxat, o'qildi deb belgilash.

`create` — internal helper, triggerlardan (approve/reject/override/...) chaqiriladi.
Idempotent emas — har marta yangi yozuv yaratadi. Batch yaratish ham mumkin.
"""

from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Text, cast, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import UZB_TZ
from app.models.enums import NotificationType
from app.models.notification import Notification
from app.services.search_utils import like_pattern, normalized_col


async def create(
    db: AsyncSession,
    *,
    user_id: UUID,
    type: NotificationType,
    title: str,
    body: str | None = None,
    data: dict[str, Any] | None = None,
    commit: bool = False,
) -> Notification:
    """Notification yozuv qo'shadi. Commit o'zgartirilgan — chaqirgan joy boshqaradi.

    Agar chaqirgan funksiya o'zi commit qilsa (odatda approve/reject),
    bu yerda commit qilmaymiz — bir transaksiyaga birlashadi.
    """
    n = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        data=data or {},
    )
    db.add(n)
    if commit:
        await db.commit()
        await db.refresh(n)
    else:
        await db.flush()
    return n


async def create_bulk(
    db: AsyncSession,
    *,
    user_ids: list[UUID],
    type: NotificationType,
    title: str,
    body: str | None = None,
    data: dict[str, Any] | None = None,
) -> list[Notification]:
    notifications = [
        Notification(
            user_id=uid,
            type=type,
            title=title,
            body=body,
            data=data or {},
        )
        for uid in user_ids
    ]
    db.add_all(notifications)
    await db.flush()
    return notifications


def _filters(
    user_id: UUID,
    *,
    unread_only: bool,
    types: Sequence[NotificationType] | None,
    search: str | None,
    date_from: date | None,
    date_to: date | None,
) -> list[Any]:
    """Ro'yxat va hisoblash uchun bir xil WHERE shartlari."""
    conds: list[Any] = [Notification.user_id == user_id]
    if unread_only:
        conds.append(Notification.read_at.is_(None))
    if types:
        conds.append(Notification.type.in_(list(types)))
    if search and search.strip():
        # Sarlavha, matn va JSON ma'lumot (login, qurilma nomi) bo'yicha; apostroflar farqsiz
        pattern = like_pattern(search)
        conds.append(
            or_(
                normalized_col(Notification.title).like(pattern, escape="\\"),
                normalized_col(func.coalesce(Notification.body, "")).like(pattern, escape="\\"),
                normalized_col(cast(Notification.data, Text)).like(pattern, escape="\\"),
            )
        )
    # Sanalar Toshkent kuni bo'yicha: [date_from 00:00, date_to 24:00)
    if date_from:
        conds.append(
            Notification.created_at >= datetime.combine(date_from, datetime.min.time(), UZB_TZ)
        )
    if date_to:
        conds.append(
            Notification.created_at
            < datetime.combine(date_to + timedelta(days=1), datetime.min.time(), UZB_TZ)
        )
    return conds


async def list_for_user(
    db: AsyncSession,
    user_id: UUID,
    *,
    offset: int = 0,
    limit: int = 20,
    unread_only: bool = False,
    types: Sequence[NotificationType] | None = None,
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[list[Notification], int]:
    conds = _filters(
        user_id,
        unread_only=unread_only,
        types=types,
        search=search,
        date_from=date_from,
        date_to=date_to,
    )
    total = (await db.execute(select(func.count(Notification.id)).where(*conds))).scalar_one()
    rows = (
        (
            await db.execute(
                select(Notification)
                .where(*conds)
                .order_by(Notification.created_at.desc())
                .offset(offset)
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return list(rows), total


async def get_for_user(db: AsyncSession, user_id: UUID, notification_id: UUID) -> Notification:
    """Bitta xabar — faqat egasi ko'radi (boshqaniki mavjudligi ham oshkor qilinmaydi)."""
    n = await db.get(Notification, notification_id)
    if not n or n.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Xabar topilmadi")
    return n


async def summary(db: AsyncSession, user_id: UUID) -> dict[str, Any]:
    """Filtr chiplari uchun: jami, o'qilmagan va tur bo'yicha sonlar (bitta GROUP BY)."""
    rows = (
        await db.execute(
            select(
                Notification.type,
                func.count(Notification.id),
                func.count(Notification.id).filter(Notification.read_at.is_(None)),
            )
            .where(Notification.user_id == user_id)
            .group_by(Notification.type)
        )
    ).all()
    by_type = {t.value: int(c) for t, c, _ in rows}
    return {
        "total": sum(by_type.values()),
        "unread": sum(int(u) for _, _, u in rows),
        "by_type": by_type,
    }


async def unread_count(db: AsyncSession, user_id: UUID) -> int:
    return (
        await db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
        )
    ).scalar_one()


async def mark_read(db: AsyncSession, user_id: UUID, notification_id: UUID) -> bool:
    """Returns True if marked (or already read), False if not found."""
    n = await db.get(Notification, notification_id)
    if not n or n.user_id != user_id:
        return False
    if n.read_at is None:
        n.read_at = datetime.now(UTC)
        await db.commit()
    return True


async def mark_all_read(db: AsyncSession, user_id: UUID) -> int:
    """Returns: affected rows count."""
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        .values(read_at=datetime.now(UTC))
    )
    await db.commit()
    return result.rowcount or 0
