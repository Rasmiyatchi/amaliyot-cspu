"""Notifications endpoints — har foydalanuvchi o'z yozuvlarini ko'radi.

`/broadcasts` — admin ommaviy xabarlari (yuborish, oldindan hisoblash, tarix).
"""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.api.deps import CurrentUser, RequireAdmin
from app.db.session import SessionDep
from app.models.enums import NotificationType
from app.schemas.broadcast import BroadcastCreate, BroadcastPreview, BroadcastRead
from app.schemas.common import Paginated
from app.schemas.notification import (
    NotificationRead,
    NotificationSummary,
    NotificationUnreadCount,
)
from app.services import audit_log as audit
from app.services import broadcast as bc_svc
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


# ─── Ommaviy xabarlar (admin) ─────────────────────────────


@router.get("/broadcasts", response_model=Paginated[BroadcastRead])
async def list_broadcasts(
    db: SessionDep,
    user: RequireAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Paginated[BroadcastRead]:
    items, total = await bc_svc.list_broadcasts(
        db, offset=(page - 1) * page_size, limit=page_size, sender=user
    )
    return Paginated(
        items=[BroadcastRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/broadcasts/preview", response_model=BroadcastPreview)
async def preview_broadcast(
    data: BroadcastCreate, db: SessionDep, user: RequireAdmin
) -> BroadcastPreview:
    """Qabul qiluvchilar sonini hisoblaydi — hech narsa yuborilmaydi."""
    return BroadcastPreview(**(await bc_svc.preview(db, data, user)))


@router.post("/broadcasts", response_model=BroadcastRead, status_code=status.HTTP_201_CREATED)
async def send_broadcast(
    data: BroadcastCreate, request: Request, db: SessionDep, user: RequireAdmin
) -> BroadcastRead:
    if data.dry_run:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Oldindan ko'rish uchun /preview")
    bc = await bc_svc.send(db, data, user)
    await audit.log(
        db,
        actor=user,
        action="broadcast",
        entity_type="broadcast",
        entity_id=bc.id,
        summary=f"Ommaviy xabar yuborildi ({bc.recipients_count} ta): {bc.subject}",
        metadata={
            "affected_count": bc.recipients_count,
            "result": "ok",
            "audience": bc.audience,
            "faculty_id": bc.faculty_id,
            "faculty_name": bc.faculty_name,
            "group_id": bc.group_id,
            "group_name": bc.group_name,
            "subject": bc.subject,
        },
        request=request,
    )
    await db.commit()
    await db.refresh(bc)
    return BroadcastRead.model_validate(bc)


@router.get("/broadcasts/{id_}", response_model=BroadcastRead)
async def get_broadcast(id_: UUID, db: SessionDep, user: RequireAdmin) -> BroadcastRead:
    return BroadcastRead.model_validate(await bc_svc.get_broadcast(db, id_, user))


# ─── Shaxsiy xabarlar ─────────────────────────────────────


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
