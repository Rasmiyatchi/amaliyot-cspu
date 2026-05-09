"""Student service — list + get with filter/joins."""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.academic import Direction, Faculty, Group
from app.models.enums import StudentStatus, UserRole
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
                base.order_by(User.last_name, User.first_name).offset(offset).limit(limit)
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


async def update_credentials(
    db: AsyncSession, id_: UUID, data: BaseModel
) -> dict[str, Any]:
    """Admin orqali talaba login/parolini yangilash."""
    student = await db.get(Student, id_)
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Talaba topilmadi: {id_}")
    user = await db.get(User, student.user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foydalanuvchi topilmadi")

    payload = data.model_dump(exclude_unset=True)
    new_username = payload.get("username")
    new_password = payload.get("password")

    if not new_username and not new_password:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Kamida username yoki parolni kiriting",
        )

    if new_username and new_username != user.username:
        user.username = new_username
    if new_password:
        user.password_hash = hash_password(new_password)

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Bu username allaqachon band"
        ) from e

    return await get_student(db, id_)


async def create_student(db: AsyncSession, data: BaseModel) -> dict[str, Any]:
    """Admin orqali bitta talaba qo'shish (Excel import alternativasi)."""
    payload = data.model_dump(exclude_unset=True)

    hemis_id: str = payload["hemis_id"]
    username: str = payload.get("username") or hemis_id
    password: str = payload["password"]
    first_name: str = payload["first_name"]
    last_name: str = payload["last_name"]
    middle_name: str | None = payload.get("middle_name")
    group_id: UUID = payload["group_id"]

    # Group mavjudligini tekshirish
    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Guruh topilmadi")

    # Hemis_id va username unique ekanligini tekshirish
    existing_hemis = (
        await db.execute(select(Student).where(Student.hemis_id == hemis_id))
    ).scalar_one_or_none()
    if existing_hemis:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Bu Talaba ID allaqachon mavjud: {hemis_id}"
        )

    user = User(
        username=username,
        password_hash=hash_password(password),
        role=UserRole.STUDENT,
        is_active=True,
        first_name=first_name,
        last_name=last_name,
        middle_name=middle_name,
        email=payload.get("email"),
        phone=payload.get("phone"),
    )
    db.add(user)
    await db.flush()

    student = Student(
        user_id=user.id,
        hemis_id=hemis_id,
        gender=payload.get("gender"),
        birth_date=payload.get("birth_date"),
        jshshir=payload.get("jshshir"),
        passport_number=payload.get("passport_number"),
        region=payload.get("region"),
        district=payload.get("district"),
        group_id=group_id,
        current_semester=payload.get("current_semester"),
        is_graduating=payload.get("is_graduating", False),
        education_language=payload.get("education_language"),
        education_form=payload.get("education_form"),
        degree_type=payload.get("degree_type"),
        status=StudentStatus.STUDYING,
    )
    db.add(student)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Username yoki Talaba ID band"
        ) from e

    return await get_student(db, student.id)


async def update_student(
    db: AsyncSession, id_: UUID, data: BaseModel
) -> dict[str, Any]:
    """Admin orqali talaba ma'lumotlarini tahrirlash."""
    student = await db.get(Student, id_)
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Talaba topilmadi: {id_}")
    user = await db.get(User, student.user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foydalanuvchi topilmadi")

    payload = data.model_dump(exclude_unset=True)

    # User maydonlari
    for key in ("first_name", "last_name", "middle_name", "email", "phone"):
        if key in payload:
            setattr(user, key, payload[key])

    # Student maydonlari
    student_keys = (
        "gender", "birth_date", "jshshir", "passport_number",
        "region", "district", "group_id", "current_semester",
        "is_graduating", "education_language", "education_form",
        "degree_type", "status",
    )
    for key in student_keys:
        if key in payload:
            setattr(student, key, payload[key])

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Konflikt") from e

    return await get_student(db, id_)


async def delete_student(db: AsyncSession, id_: UUID) -> None:
    """Admin: talaba va u bilan bog'liq User'ni o'chirish."""
    student = await db.get(Student, id_)
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Talaba topilmadi: {id_}")
    user_id = student.user_id
    await db.delete(student)
    user = await db.get(User, user_id)
    if user:
        await db.delete(user)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Talabaning amaliyot/topshiriq yozuvlari bor — avval ularni o'chiring",
        ) from e
