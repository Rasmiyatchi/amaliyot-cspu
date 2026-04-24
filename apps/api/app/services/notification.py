"""Notification service — yaratish, ro'yxat, o'qildi deb belgilash.

`create` — internal helper, triggerlardan (approve/reject/override/...) chaqiriladi.
Idempotent emas — har marta yangi yozuv yaratadi. Batch yaratish ham mumkin.
"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import NotificationType
from app.models.notification import Notification


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


async def list_for_user(
    db: AsyncSession,
    user_id: UUID,
    *,
    offset: int = 0,
    limit: int = 20,
    unread_only: bool = False,
) -> tuple[list[Notification], int]:
    base = select(Notification).where(Notification.user_id == user_id)
    count_stmt = select(func.count(Notification.id)).where(
        Notification.user_id == user_id
    )
    if unread_only:
        base = base.where(Notification.read_at.is_(None))
        count_stmt = count_stmt.where(Notification.read_at.is_(None))

    total = (await db.execute(count_stmt)).scalar_one()
    rows = (
        (
            await db.execute(
                base.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return list(rows), total


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
