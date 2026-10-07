"""Notifications endpoints — har foydalanuvchi o'z yozuvlarini ko'radi."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser
from app.db.session import SessionDep
from app.models.enums import NotificationType
from app.schemas.common import Paginated
from app.schemas.notification import (
    NotificationRead,
    NotificationSummary,
    NotificationUnreadCount,
)
from app.services import notification as svc

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=Paginated[NotificationRead])
async def list_notifications(
    db: SessionDep,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False, alias="unread"),
    types: list[NotificationType] | None = Query(None, alias="type"),
    search: str | None = Query(None, min_length=1, max_length=100),
    date_from: date | None = None,
    date_to: date | None = None,
) -> Paginated[NotificationRead]:
    if date_from and date_to and date_to < date_from:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Sana oralig'i noto'g'ri")
    offset = (page - 1) * page_size
    items, total = await svc.list_for_user(
        db,
        user.id,
        offset=offset,
        limit=page_size,
        unread_only=unread_only,
        types=types,
        search=search,
        date_from=date_from,
        date_to=date_to,
    )
    return Paginated(
        items=[NotificationRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/unread-count", response_model=NotificationUnreadCount)
async def unread_count(db: SessionDep, user: CurrentUser) -> NotificationUnreadCount:
    return NotificationUnreadCount(unread=await svc.unread_count(db, user.id))


@router.get("/summary", response_model=NotificationSummary)
async def notifications_summary(db: SessionDep, user: CurrentUser) -> NotificationSummary:
    return NotificationSummary(**(await svc.summary(db, user.id)))


@router.get("/{notification_id}", response_model=NotificationRead)
async def get_notification(
    notification_id: UUID, db: SessionDep, user: CurrentUser
) -> NotificationRead:
    return NotificationRead.model_validate(await svc.get_for_user(db, user.id, notification_id))


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(notification_id: UUID, db: SessionDep, user: CurrentUser) -> None:
    await svc.mark_read(db, user.id, notification_id)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(db: SessionDep, user: CurrentUser) -> None:
    await svc.mark_all_read(db, user.id)
