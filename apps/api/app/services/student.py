"""Student service — list + get with filter/joins."""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import Direction, Faculty, Group
from app.models.enums import StudentStatus
from app.models.student import Student
from app.models.user import User


def _student_base_select() -> Any:
    """Student + User + Group + Direction + Faculty columnlarini flat qaytaradi."""
    return (
        select(
            Student.id,
            Student.user_id,
            Student.hemis_id,
            User.username,
            User.first_name,
            User.last_name,
            User.middle_name,
            User.email,
            User.phone,
            User.avatar_url,
            User.is_active,
            User.last_login_at,
            Student.gender,
            Student.birth_date,
            Student.jshshir,
            Student.passport_number,
            Student.region,
            Student.district,
            Student.group_id,
            Group.name.label("group_name"),
            Group.direction_id,
            Direction.code.label("direction_code"),
            Direction.name.label("direction_name"),
            Direction.faculty_id,
            Faculty.name.label("faculty_name"),
            Group.course,
            Student.current_semester,
            Student.is_graduating,
            Student.enrollment_year,
            Student.education_language,
            Student.education_form,
            Student.degree_type,
            Student.status,
            Student.created_at,
        )
        .join(User, User.id == Student.user_id)
        .outerjoin(Group, Group.id == Student.group_id)
        .outerjoin(Direction, Direction.id == Group.direction_id)
        .outerjoin(Faculty, Faculty.id == Direction.faculty_id)
    )


def _row_to_dict(r: dict[str, Any]) -> dict[str, Any]:
    middle = r["middle_name"]
    full_name = f"{r['last_name']} {r['first_name']}" + (f" {middle}" if middle else "")
    out = dict(r)
    out["full_name"] = full_name
    return out


async def list_students(
    db: AsyncSession,
    offset: int,
    limit: int,
    faculty_id: UUID | None = None,
    direction_id: UUID | None = None,
    group_id: UUID | None = None,
    course: int | None = None,
    status_filter: StudentStatus | None = None,
    search: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    base = _student_base_select()

    # Count query (alohida — paginatsiz)
    count_stmt = (
        select(func.count(Student.id))
        .select_from(Student)
        .join(User, User.id == Student.user_id)
        .outerjoin(Group, Group.id == Student.group_id)
        .outerjoin(Direction, Direction.id == Group.direction_id)
    )

    def apply_filters(stmt: Any) -> Any:
        if faculty_id:
            stmt = stmt.where(Direction.faculty_id == faculty_id)
        if direction_id:
            stmt = stmt.where(Group.direction_id == direction_id)
        if group_id:
            stmt = stmt.where(Student.group_id == group_id)
        if course is not None:
            stmt = stmt.where(Group.course == course)
        if status_filter:
            stmt = stmt.where(Student.status == status_filter)
        if search:
            like = f"%{search.lower()}%"
            stmt = stmt.where(
                func.lower(User.first_name).like(like)
                | func.lower(User.last_name).like(like)
                | Student.hemis_id.like(f"%{search}%")
                | User.username.like(f"%{search}%")
            )
        return stmt

    base = apply_filters(base)
    count_stmt = apply_filters(count_stmt)

    total = (await db.execute(count_stmt)).scalar_one()
    rows = (
        (
            await db.execute(
                base.order_by(User.last_name, User.first_name)
                .offset(offset)
                .limit(limit)
            )
        )
        .mappings()
        .all()
    )

    return [_row_to_dict(dict(r)) for r in rows], total


async def get_student(db: AsyncSession, id_: UUID) -> dict[str, Any]:
    stmt = _student_base_select().where(Student.id == id_)
    row = (await db.execute(stmt)).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Talaba topilmadi: {id_}")
    return _row_to_dict(dict(row))
