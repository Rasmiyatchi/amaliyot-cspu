"""Obyekt darajasidagi ruxsatlar (kim qaysi biriktirish / supervizorni ko'ra oladi).

Ro'yxat endpoint'lari fakultet admini uchun `faculty_id` ni majburlaydi, lekin `/{id}`
endpoint'lari ilgari faqat rolni tekshirardi — boshqa fakultet obyekti UUID orqali ochilardi.
Bu yerdagi yordamchilar `/{id}` yo'llarida ishlatiladi. Ruxsat yo'q bo'lsa 404 (obyekt
mavjudligini ham oshkor qilmaymiz).
"""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import Department, Direction, Group
from app.models.enums import UserRole
from app.models.practice_assignment import PracticeAssignment
from app.models.student import Student
from app.models.supervisor import Supervisor
from app.models.user import User


def effective_faculty_id(user: User, requested: UUID | None = None) -> UUID | None:
    """Fakultetga biriktirilgan admin uchun har doim o'z fakulteti; boshqalar uchun so'ralgani."""
    if user.role == UserRole.ADMIN and user.faculty_id:
        return user.faculty_id
    return requested


async def assignment_faculty_id(db: AsyncSession, assignment_id: UUID) -> UUID | None:
    """Biriktirish fakulteti: biriktirish paytidagi guruh (snapshot), bo'lmasa talabaning guruhi."""
    stmt = (
        select(Direction.faculty_id)
        .select_from(PracticeAssignment)
        .join(Student, Student.id == PracticeAssignment.student_id)
        .join(Group, Group.id == func.coalesce(PracticeAssignment.group_id, Student.group_id))
        .join(Direction, Direction.id == Group.direction_id)
        .where(PracticeAssignment.id == assignment_id)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def assert_assignment_access(db: AsyncSession, user: User, assignment_id: UUID) -> None:
    """Biriktirishga kirish huquqi: super admin — hammasi; admin — o'z fakulteti;
    supervizor — o'z talabasi; talaba — o'zi."""
    not_found = HTTPException(status.HTTP_404_NOT_FOUND, "Biriktirish topilmadi")
    if user.role == UserRole.SUPER_ADMIN:
        return
    if user.role == UserRole.ADMIN:
        if not user.faculty_id:
            return
        if await assignment_faculty_id(db, assignment_id) != user.faculty_id:
            raise not_found
        return
    if user.role == UserRole.SUPERVISOR:
        owned = (
            await db.execute(
                select(PracticeAssignment.id)
                .join(Supervisor, Supervisor.id == PracticeAssignment.supervisor_id)
                .where(PracticeAssignment.id == assignment_id, Supervisor.user_id == user.id)
            )
        ).scalar_one_or_none()
        if not owned:
            raise not_found
        return
    if user.role == UserRole.STUDENT:
        owned = (
            await db.execute(
                select(PracticeAssignment.id)
                .join(Student, Student.id == PracticeAssignment.student_id)
                .where(PracticeAssignment.id == assignment_id, Student.user_id == user.id)
            )
        ).scalar_one_or_none()
        if not owned:
            raise not_found
        return
    raise not_found


async def assert_supervisor_in_scope(db: AsyncSession, user: User, supervisor_id: UUID) -> None:
    """Fakultet admini faqat o'z fakultetidagi (yoki fakultetsiz) supervizorni boshqaradi."""
    if user.role != UserRole.ADMIN or not user.faculty_id:
        return
    faculty_id = (
        await db.execute(select(Supervisor.faculty_id).where(Supervisor.id == supervisor_id))
    ).scalar_one_or_none()
    if faculty_id is not None and faculty_id != user.faculty_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Supervizor topilmadi: {supervisor_id}")


# ─── Yozish amallari uchun fakultet doirasi ───────────────────────────────────
# Fakultetga biriktirilgan admin faqat o'z fakulteti obyektlarini yaratadi/o'zgartiradi/o'chiradi.
# Ilgari faqat ro'yxatlar cheklangan edi: UUID bilan boshqa fakultet guruhini o'chirish,
# boshqa fakultet guruhiga talaba qo'shish yoki o'quv yilini o'zgartirish mumkin edi.

SCOPE_FORBIDDEN = "Bu amal faqat o'z fakultetingiz doirasida mumkin"
UNIVERSITY_ONLY = "Bu amal faqat universitet darajasidagi admin uchun"


def is_faculty_scoped(user: User) -> bool:
    return user.role == UserRole.ADMIN and user.faculty_id is not None


def require_university_admin(user: User) -> None:
    """Fakultetlar, o'quv yillari kabi umumuniversitet ma'lumotlari."""
    if is_faculty_scoped(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, UNIVERSITY_ONLY)


def assert_faculty_scope(user: User, faculty_id: UUID | None) -> None:
    """Fakultet admini uchun obyekt fakulteti o'ziniki bo'lishi shart (fakultetsiz ham emas)."""
    if is_faculty_scoped(user) and faculty_id != user.faculty_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, SCOPE_FORBIDDEN)


async def direction_faculty_id(db: AsyncSession, direction_id: UUID | None) -> UUID | None:
    if not direction_id:
        return None
    return (
        await db.execute(select(Direction.faculty_id).where(Direction.id == direction_id))
    ).scalar_one_or_none()


async def department_faculty_id(db: AsyncSession, department_id: UUID | None) -> UUID | None:
    if not department_id:
        return None
    return (
        await db.execute(select(Department.faculty_id).where(Department.id == department_id))
    ).scalar_one_or_none()


async def group_faculty_id(db: AsyncSession, group_id: UUID | None) -> UUID | None:
    if not group_id:
        return None
    return (
        await db.execute(
            select(Direction.faculty_id)
            .join(Group, Group.direction_id == Direction.id)
            .where(Group.id == group_id)
        )
    ).scalar_one_or_none()


async def student_faculty_id(db: AsyncSession, student_id: UUID) -> UUID | None:
    """Talabaning joriy guruhi fakulteti.

    Guruhsiz talaba — None: fakultet admini uchun doiradan tashqari.
    """
    return (
        await db.execute(
            select(Direction.faculty_id)
            .select_from(Student)
            .join(Group, Group.id == Student.group_id)
            .join(Direction, Direction.id == Group.direction_id)
            .where(Student.id == student_id)
        )
    ).scalar_one_or_none()


async def assert_students_in_scope(db: AsyncSession, user: User, student_ids: list[UUID]) -> None:
    """Fakultet admini faqat o'z fakulteti talabalariga biriktirish yarata oladi."""
    if not is_faculty_scoped(user) or not student_ids:
        return
    rows = (
        await db.execute(
            select(Student.id, Direction.faculty_id)
            .select_from(Student)
            .outerjoin(Group, Group.id == Student.group_id)
            .outerjoin(Direction, Direction.id == Group.direction_id)
            .where(Student.id.in_(student_ids))
        )
    ).all()
    if any(faculty_id != user.faculty_id for _, faculty_id in rows):
        raise HTTPException(status.HTTP_403_FORBIDDEN, SCOPE_FORBIDDEN)


async def assert_child_assignment_access(
    db: AsyncSession, user: User, model: Any, entity_id: UUID, not_found: str = "Topilmadi"
) -> None:
    """Topshiriq/kundalik/tahlil/hisobot kabi `assignment_id` li yozuv orqali ruxsat."""
    assignment_id = (
        await db.execute(select(model.assignment_id).where(model.id == entity_id))
    ).scalar_one_or_none()
    if assignment_id is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, not_found)
    await assert_assignment_access(db, user, assignment_id)
