"""Ommaviy xabarlar — admin talabalar/supervizorlarga xabar yuboradi.

Har qabul qiluvchiga alohida `Notification` (type=broadcast) yoziladi (qo'ng'iroq, xabarlar
sahifasi, filtr/qidiruv — barchasi mavjud mexanizm orqali ishlaydi). `Broadcast` jadvali
yuborish tarixini saqlaydi: mavzu, matn, auditoriya, soni, vaqt, kim yuborgan.

Fakultetga biriktirilgan admin faqat o'z fakulteti doirasida yuboradi: "barcha talabalar"
uning uchun fakultet talabalari, supervizorlar — fakultet supervizorlari.
"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import Direction, Faculty, Group
from app.models.broadcast import Broadcast
from app.models.enums import NotificationType, StudentStatus
from app.models.notification import Notification
from app.models.student import Student
from app.models.supervisor import Supervisor
from app.models.user import User
from app.schemas.broadcast import BroadcastCreate
from app.services.audit_log import _full_name
from app.services.scoping import SCOPE_FORBIDDEN, group_faculty_id, is_faculty_scoped

#: Notification'lar shuncha-shunchadan INSERT qilinadi (minglab talaba uchun)
INSERT_CHUNK = 500


def _students_base() -> Any:
    """Faol (o'qiyotgan) talabalarning faol user'lari."""
    return (
        select(User.id)
        .select_from(Student)
        .join(User, User.id == Student.user_id)
        .where(User.is_active.is_(True), Student.status == StudentStatus.STUDYING)
    )


def _students_with_faculty() -> Any:
    return (
        _students_base()
        .join(Group, Group.id == Student.group_id)
        .join(Direction, Direction.id == Group.direction_id)
    )


def _supervisors_base() -> Any:
    return (
        select(User.id)
        .select_from(Supervisor)
        .join(User, User.id == Supervisor.user_id)
        .where(User.is_active.is_(True), Supervisor.is_active.is_(True))
    )


async def _resolve_scope(
    db: AsyncSession, data: BroadcastCreate, sender: User
) -> tuple[UUID | None, UUID | None]:
    """Fakultet admini doirasi: (faculty_id, group_id) — tekshirilgan."""
    faculty_id = data.faculty_id
    group_id = data.group_id
    if is_faculty_scoped(sender):
        own = sender.faculty_id
        if faculty_id and faculty_id != own:
            raise HTTPException(status.HTTP_403_FORBIDDEN, SCOPE_FORBIDDEN)
        if group_id and await group_faculty_id(db, group_id) != own:
            raise HTTPException(status.HTTP_403_FORBIDDEN, SCOPE_FORBIDDEN)
        faculty_id = own
    return faculty_id, group_id


async def recipient_ids(db: AsyncSession, data: BroadcastCreate, sender: User) -> list[UUID]:
    faculty_id, group_id = await _resolve_scope(db, data, sender)
    stmts: list[Any] = []
    aud = data.audience

    if aud in ("all_students", "everyone", "faculty"):
        stmt = _students_with_faculty() if faculty_id else _students_base()
        if faculty_id:
            stmt = stmt.where(Direction.faculty_id == faculty_id)
        stmts.append(stmt)
    if aud == "group":
        stmt = _students_base().where(Student.group_id == group_id)
        stmts.append(stmt)
    if aud == "students":
        stmt = _students_base().where(Student.id.in_(data.student_ids or []))
        if faculty_id:
            # Fakultet admini boshqa fakultet talabasini tanlay olmaydi
            stmt = (
                stmt.join(Group, Group.id == Student.group_id)
                .join(Direction, Direction.id == Group.direction_id)
                .where(Direction.faculty_id == faculty_id)
            )
        stmts.append(stmt)
    if aud in ("supervisors", "everyone"):
        stmt = _supervisors_base()
        if faculty_id:
            stmt = stmt.where(Supervisor.faculty_id == faculty_id)
        stmts.append(stmt)

    ids: set[UUID] = set()
    for stmt in stmts:
        ids.update((await db.execute(stmt)).scalars().all())
    # Yuboruvchining o'zi ro'yxatga tushmaydi
    ids.discard(sender.id)
    return sorted(ids, key=str)


async def _names(
    db: AsyncSession, faculty_id: UUID | None, group_id: UUID | None
) -> tuple[str | None, str | None]:
    fname = (
        (
            await db.execute(select(Faculty.name).where(Faculty.id == faculty_id))
        ).scalar_one_or_none()
        if faculty_id
        else None
    )
    gname = (
        (await db.execute(select(Group.name).where(Group.id == group_id))).scalar_one_or_none()
        if group_id
        else None
    )
    return fname, gname


async def preview(db: AsyncSession, data: BroadcastCreate, sender: User) -> dict[str, Any]:
    ids = await recipient_ids(db, data, sender)
    faculty_id, group_id = await _resolve_scope(db, data, sender)
    fname, gname = await _names(db, faculty_id, group_id)
    return {"recipients_count": len(ids), "faculty_name": fname, "group_name": gname}


async def send(db: AsyncSession, data: BroadcastCreate, sender: User) -> Broadcast:
    """Xabar yuboradi (commit qilmaydi — caller audit yozib commit qiladi)."""
    ids = await recipient_ids(db, data, sender)
    if not ids:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Qabul qiluvchi topilmadi — auditoriyani tekshiring"
        )
    faculty_id, group_id = await _resolve_scope(db, data, sender)
    fname, gname = await _names(db, faculty_id, group_id)
    now = datetime.now(UTC)

    bc = Broadcast(
        sender_id=sender.id,
        sender_name=_full_name(sender),
        audience=data.audience,
        faculty_id=faculty_id,
        faculty_name=fname,
        group_id=group_id,
        group_name=gname,
        target_user_ids=[str(i) for i in ids] if data.audience == "students" else None,
        subject=data.subject.strip(),
        body=data.body.strip(),
        recipients_count=len(ids),
        sent_at=now,
    )
    db.add(bc)
    await db.flush()

    payload = {
        "broadcast_id": str(bc.id),
        "kind": "broadcast",
        "audience": data.audience,
        "sender": bc.sender_name,
    }
    for i in range(0, len(ids), INSERT_CHUNK):
        chunk = ids[i : i + INSERT_CHUNK]
        await db.execute(
            insert(Notification),
            [
                {
                    "user_id": uid,
                    "type": NotificationType.BROADCAST,
                    "title": bc.subject,
                    "body": bc.body,
                    "data": payload,
                    "created_at": now,
                    "updated_at": now,
                }
                for uid in chunk
            ],
        )
    return bc


async def list_broadcasts(
    db: AsyncSession, *, offset: int, limit: int, sender: User
) -> tuple[list[Broadcast], int]:
    conds: list[Any] = []
    if is_faculty_scoped(sender):
        # Fakultet admini faqat o'z fakulteti (yoki o'zi yuborgan) xabarlarini ko'radi
        conds.append(
            (Broadcast.faculty_id == sender.faculty_id) | (Broadcast.sender_id == sender.id)
        )
    total = (await db.execute(select(func.count(Broadcast.id)).where(*conds))).scalar_one()
    rows = (
        (
            await db.execute(
                select(Broadcast)
                .where(*conds)
                .order_by(Broadcast.sent_at.desc())
                .offset(offset)
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return list(rows), total


async def get_broadcast(db: AsyncSession, id_: UUID, sender: User) -> Broadcast:
    bc = await db.get(Broadcast, id_)
    if not bc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Xabar topilmadi")
    foreign = bc.faculty_id != sender.faculty_id and bc.sender_id != sender.id
    if is_faculty_scoped(sender) and foreign:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Xabar topilmadi")
    return bc
