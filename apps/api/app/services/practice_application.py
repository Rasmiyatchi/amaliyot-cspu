"""PracticeApplication service — talaba arizasi oqimi + QR tasdiq + ilova."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import Direction, Group
from app.models.enums import ApplicationStatus
from app.models.practice_application import PracticeApplication
from app.models.student import Student
from app.models.user import User
from app.schemas.practice_application import ApplicationCreate


async def _student_for_user(db: AsyncSession, user: User) -> Student:
    student = (
        await db.execute(select(Student).where(Student.user_id == user.id))
    ).scalar_one_or_none()
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Talaba profili topilmadi")
    return student


def _read_select():
    return (
        select(
            PracticeApplication,
            (User.last_name + " " + User.first_name).label("student_name"),
            Direction.name.label("direction_name"),
            Group.name.label("group_name"),
            Group.course.label("course"),
        )
        .join(Student, Student.id == PracticeApplication.student_id)
        .join(User, User.id == Student.user_id)
        .outerjoin(Group, Group.id == Student.group_id)
        .outerjoin(Direction, Direction.id == Group.direction_id)
    )


def _to_read(row: Any) -> dict[str, Any]:
    app_obj = row[0]
    return {
        **{c.name: getattr(app_obj, c.name) for c in app_obj.__table__.columns},
        "student_name": (row.student_name or "").strip() or None,
        "direction_name": row.direction_name,
        "group_name": row.group_name,
        "course": row.course,
    }


async def create_for_student(
    db: AsyncSession, user: User, data: ApplicationCreate
) -> dict[str, Any]:
    student = await _student_for_user(db, user)
    app_obj = PracticeApplication(
        student_id=student.id,
        object_name=data.object_name,
        object_location=data.object_location,
        manager_name=data.manager_name,
        manager_phone=data.manager_phone,
        region=data.region or student.region,
        district=data.district or student.district,
        note=data.note,
        status=ApplicationStatus.PENDING,
    )
    db.add(app_obj)
    await db.commit()
    return await get_one(db, app_obj.id)


async def list_my(db: AsyncSession, user: User) -> list[dict[str, Any]]:
    student = await _student_for_user(db, user)
    rows = (
        await db.execute(
            _read_select()
            .where(PracticeApplication.student_id == student.id)
            .order_by(PracticeApplication.created_at.desc())
        )
    ).all()
    return [_to_read(r) for r in rows]


async def list_all(
    db: AsyncSession,
    *,
    status_filter: ApplicationStatus | None = None,
    region: str | None = None,
    search: str | None = None,
) -> list[dict[str, Any]]:
    stmt = _read_select()
    if status_filter:
        stmt = stmt.where(PracticeApplication.status == status_filter)
    if region:
        stmt = stmt.where(PracticeApplication.region == region)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            func.lower(User.last_name).like(like)
            | func.lower(User.first_name).like(like)
            | func.lower(PracticeApplication.object_name).like(like)
        )
    rows = (await db.execute(stmt.order_by(PracticeApplication.created_at.desc()))).all()
    return [_to_read(r) for r in rows]


async def get_one(db: AsyncSession, id_: UUID) -> dict[str, Any]:
    row = (
        await db.execute(_read_select().where(PracticeApplication.id == id_))
    ).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ariza topilmadi")
    return _to_read(row)


async def _get_obj(db: AsyncSession, id_: UUID) -> PracticeApplication:
    obj = await db.get(PracticeApplication, id_)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ariza topilmadi")
    return obj


async def approve(db: AsyncSession, id_: UUID, user: User) -> dict[str, Any]:
    obj = await _get_obj(db, id_)
    if obj.status == ApplicationStatus.APPROVED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ariza allaqachon tasdiqlangan")
    obj.status = ApplicationStatus.APPROVED
    obj.qr_token = obj.qr_token or secrets.token_urlsafe(12)
    obj.reviewed_by_id = user.id
    obj.reviewed_at = datetime.now(UTC)
    await db.commit()
    return await get_one(db, id_)


async def reject(
    db: AsyncSession, id_: UUID, user: User, note: str | None
) -> dict[str, Any]:
    obj = await _get_obj(db, id_)
    obj.status = ApplicationStatus.REJECTED
    obj.reviewed_by_id = user.id
    obj.reviewed_at = datetime.now(UTC)
    obj.review_note = note
    await db.commit()
    return await get_one(db, id_)


async def appendix_by_region(db: AsyncSession) -> list[dict[str, Any]]:
    """Tasdiqlangan arizalarni hudud bo'yicha guruhlaydi (ilova).

    Faqat bir hududda 2+ talaba bo'lsa ilovaga kiradi.
    """
    rows = await list_all(db, status_filter=ApplicationStatus.APPROVED)
    groups: dict[str, list[dict[str, Any]]] = {}
    for r in rows:
        key = r.get("region") or "—"
        groups.setdefault(key, []).append(r)
    result = []
    for region, students in sorted(groups.items()):
        if len(students) < 2:
            continue
        result.append(
            {
                "region": region,
                "count": len(students),
                "students": [
                    {
                        "student_name": s["student_name"],
                        "direction_name": s["direction_name"],
                        "course": s["course"],
                        "object_name": s["object_name"],
                        "object_location": s["object_location"],
                    }
                    for s in students
                ],
            }
        )
    return result
