"""Inquiry service — talaba ↔ admin murojaat (chat)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import UserRole
from app.models.inquiry import Inquiry, InquiryMessage
from app.models.student import Student
from app.models.user import User
from app.schemas.inquiry import InquiryCreate


def _is_admin(user: User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)


async def _student_for_user(db: AsyncSession, user: User) -> Student:
    student = (
        await db.execute(select(Student).where(Student.user_id == user.id))
    ).scalar_one_or_none()
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Talaba profili topilmadi")
    return student


async def _enrich(db: AsyncSession, inquiries: list[Inquiry]) -> list[dict[str, Any]]:
    if not inquiries:
        return []
    ids = [i.id for i in inquiries]
    # message count + last message time
    stats = {
        row.inquiry_id: (row.cnt, row.last)
        for row in (
            await db.execute(
                select(
                    InquiryMessage.inquiry_id,
                    func.count(InquiryMessage.id).label("cnt"),
                    func.max(InquiryMessage.created_at).label("last"),
                ).where(InquiryMessage.inquiry_id.in_(ids)).group_by(InquiryMessage.inquiry_id)
            )
        ).all()
    }
    # student names
    names = {
        row.id: f"{row.last_name} {row.first_name}".strip()
        for row in (
            await db.execute(
                select(Student.id, User.last_name, User.first_name)
                .join(User, User.id == Student.user_id)
                .where(Student.id.in_([i.student_id for i in inquiries]))
            )
        ).all()
    }
    out = []
    for i in inquiries:
        cnt, last = stats.get(i.id, (0, None))
        out.append(
            {
                "id": i.id,
                "student_id": i.student_id,
                "student_name": names.get(i.student_id),
                "subject": i.subject,
                "is_resolved": i.is_resolved,
                "message_count": cnt,
                "last_message_at": last,
                "created_at": i.created_at,
                "updated_at": i.updated_at,
            }
        )
    return out


async def create_for_student(
    db: AsyncSession, user: User, data: InquiryCreate
) -> dict[str, Any]:
    student = await _student_for_user(db, user)
    inquiry = Inquiry(student_id=student.id, subject=data.subject)
    db.add(inquiry)
    await db.flush()
    db.add(
        InquiryMessage(
            inquiry_id=inquiry.id, sender_id=user.id, from_admin=False, body=data.body
        )
    )
    await db.commit()
    return (await _enrich(db, [inquiry]))[0]


async def list_my(db: AsyncSession, user: User) -> list[dict[str, Any]]:
    student = await _student_for_user(db, user)
    rows = list(
        (
            await db.execute(
                select(Inquiry)
                .where(Inquiry.student_id == student.id)
                .order_by(Inquiry.updated_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return await _enrich(db, rows)


async def list_all(
    db: AsyncSession, *, resolved: bool | None = None
) -> list[dict[str, Any]]:
    stmt = select(Inquiry).order_by(Inquiry.updated_at.desc())
    if resolved is not None:
        stmt = stmt.where(Inquiry.is_resolved.is_(resolved))
    rows = list((await db.execute(stmt)).scalars().all())
    return await _enrich(db, rows)


async def get_detail(db: AsyncSession, user: User, id_: UUID) -> dict[str, Any]:
    inquiry = await db.get(Inquiry, id_)
    if not inquiry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Murojaat topilmadi")
    if not _is_admin(user):
        student = await _student_for_user(db, user)
        if inquiry.student_id != student.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ruxsat yo'q")
    messages = list(
        (
            await db.execute(
                select(InquiryMessage)
                .where(InquiryMessage.inquiry_id == id_)
                .order_by(InquiryMessage.created_at.asc())
            )
        )
        .scalars()
        .all()
    )
    base = (await _enrich(db, [inquiry]))[0]
    base["messages"] = [
        {
            "id": m.id,
            "from_admin": m.from_admin,
            "sender_id": m.sender_id,
            "body": m.body,
            "created_at": m.created_at,
        }
        for m in messages
    ]
    return base


async def add_message(
    db: AsyncSession, user: User, id_: UUID, body: str
) -> dict[str, Any]:
    inquiry = await db.get(Inquiry, id_)
    if not inquiry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Murojaat topilmadi")
    admin = _is_admin(user)
    if not admin:
        student = await _student_for_user(db, user)
        if inquiry.student_id != student.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ruxsat yo'q")
    db.add(
        InquiryMessage(inquiry_id=id_, sender_id=user.id, from_admin=admin, body=body)
    )
    # Yangi xabar bilan tred yuqoriga chiqsin (real datetime — expire_on_commit=False
    # bo'lgani uchun func.now() qoldirib bo'lmaydi, aks holda Pydantic xato beradi).
    inquiry.updated_at = datetime.now(UTC)
    await db.commit()
    return await get_detail(db, user, id_)


async def set_resolved(
    db: AsyncSession, id_: UUID, resolved: bool
) -> dict[str, Any]:
    inquiry = await db.get(Inquiry, id_)
    if not inquiry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Murojaat topilmadi")
    inquiry.is_resolved = resolved
    await db.commit()
    return (await _enrich(db, [inquiry]))[0]
