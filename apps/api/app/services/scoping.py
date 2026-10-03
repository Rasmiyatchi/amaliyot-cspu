"""Obyekt darajasidagi ruxsatlar (kim qaysi biriktirish / supervizorni ko'ra oladi).

Ro'yxat endpoint'lari fakultet admini uchun `faculty_id` ni majburlaydi, lekin `/{id}`
endpoint'lari ilgari faqat rolni tekshirardi — boshqa fakultet obyekti UUID orqali ochilardi.
Bu yerdagi yordamchilar `/{id}` yo'llarida ishlatiladi. Ruxsat yo'q bo'lsa 404 (obyekt
mavjudligini ham oshkor qilmaymiz).
"""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import Direction, Group
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
