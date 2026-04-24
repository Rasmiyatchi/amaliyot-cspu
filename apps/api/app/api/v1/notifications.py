"""Notifications endpoints — har foydalanuvchi o'z yozuvlarini ko'radi."""

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser
from app.db.session import SessionDep
from app.schemas.common import Paginated
from app.schemas.notification import NotificationRead, NotificationUnreadCount
from app.services import notification as svc

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=Paginated[NotificationRead])
async def list_notifications(
    db: SessionDep,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False, alias="unread"),
) -> Paginated[NotificationRead]:
    offset = (page - 1) * page_size
    items, total = await svc.list_for_user(
        db, user.id, offset=offset, limit=page_size, unread_only=unread_only
    )
    return Paginated(
        items=[NotificationRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/unread-count", response_model=NotificationUnreadCount)
async def unread_count(
    db: SessionDep, user: CurrentUser
) -> NotificationUnreadCount:
    return NotificationUnreadCount(unread=await svc.unread_count(db, user.id))


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    notification_id: UUID, db: SessionDep, user: CurrentUser
) -> None:
    await svc.mark_read(db, user.id, notification_id)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(db: SessionDep, user: CurrentUser) -> None:
    await svc.mark_all_read(db, user.id)
