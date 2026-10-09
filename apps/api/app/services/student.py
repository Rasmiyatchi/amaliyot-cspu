"""Student service — list + get with filter/joins."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password_async
from app.models.academic import Direction, Faculty, Group
from app.models.enums import AssignmentStatus, StudentStatus, UserRole
from app.models.practice_assignment import PracticeAssignment
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
            User.device_id,
            User.device_label,
            User.device_bound_at,
            User.device_info,
            Student.gender,
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
    academic_year_id: UUID | None = None,
    status_filter: StudentStatus | None = None,
    search: str | None = None,
    has_assignment: bool | None = None,
    has_device: bool | None = None,
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
        if academic_year_id:
            stmt = stmt.where(Group.academic_year_id == academic_year_id)
        if status_filter:
            stmt = stmt.where(Student.status == status_filter)
        if has_device is not None:
            stmt = stmt.where(
                User.device_id.is_not(None) if has_device else User.device_id.is_(None)
            )
        if has_assignment is not None:
            asn_subq = (
                select(1)
                .select_from(PracticeAssignment)
                .where(
                    PracticeAssignment.student_id == Student.id,
                    PracticeAssignment.status.in_(
                        [
                            AssignmentStatus.DRAFT,
                            AssignmentStatus.ACTIVE,
                            AssignmentStatus.COMPLETED,
                        ]
                    ),
                )
                .exists()
            )
            stmt = stmt.where(asn_subq) if has_assignment else stmt.where(~asn_subq)
        if search:
            clean_search = (
                search.replace("'", "")
                .replace("’", "")
                .replace("‘", "")
                .replace("ʻ", "")
                .replace("`", "")
                .lower()
                .strip()
            )
            like = f"%{clean_search}%"

            def _clean_sql(col: Any) -> Any:
                return func.replace(
                    func.replace(
                        func.replace(
                            func.replace(func.replace(func.lower(col), "'", ""), "’", ""), "‘", ""
                        ),
                        "ʻ",
                        "",
                    ),
                    "`",
                    "",
                )

            full_name_last_first = _clean_sql(
                User.last_name + " " + User.first_name + " " + func.coalesce(User.middle_name, "")
            )
            full_name_first_last = _clean_sql(User.first_name + " " + User.last_name)

            stmt = stmt.where(
                full_name_last_first.like(like)
                | full_name_first_last.like(like)
                | Student.hemis_id.like(f"%{search.strip()}%")
                | _clean_sql(User.username).like(like)
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


async def update_credentials(db: AsyncSession, id_: UUID, data: BaseModel) -> dict[str, Any]:
    """Admin orqali talaba login/parolini yangilash.

    Agar parol o'zgartirilsa — `must_change_password=True` flag qo'yiladi
    (talaba keyingi kirishda yangi parolni qo'yadi).
    """
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
        user.password_hash = await hash_password_async(new_password, temporary=True)
        user.must_change_password = True  # admin reset → talaba o'zgartirsin
        # Eski parol bilan ochilgan sessiyalar yopiladi
        from app.services.auth import revoke_all_refresh_tokens

        await revoke_all_refresh_tokens(db, user.id)

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Bu username allaqachon band") from e

    return await get_student(db, id_)


async def create_student(db: AsyncSession, data: BaseModel) -> dict[str, Any]:
    """Admin orqali bitta talaba qo'shish (Excel import alternativasi).

    Username/parol avto-generatsiya qilinadi (LOGIN_YEAR_PREFIX bilan).
    Birinchi kirishda parol almashtirish majburiy.
    """
    import secrets
    import string

    from app.core.config import settings as app_settings

    payload = data.model_dump(exclude_unset=True)

    hemis_id: str = payload["hemis_id"]
    first_name: str = payload["first_name"]
    last_name: str = payload["last_name"]
    middle_name: str | None = payload.get("middle_name")
    group_id: UUID = payload["group_id"]

    # Group mavjudligini tekshirish
    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Guruh topilmadi")

    # Hemis_id unique ekanligini tekshirish
    existing_hemis = (
        await db.execute(select(Student).where(Student.hemis_id == hemis_id))
    ).scalar_one_or_none()
    if existing_hemis:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Bu Talaba ID allaqachon mavjud: {hemis_id}")

    # Avto-generatsiya: 2500 + 8 raqam. login=parol.
    prefix = app_settings.LOGIN_YEAR_PREFIX
    username: str | None = None
    for _ in range(10):
        suffix = "".join(secrets.choice(string.digits) for _ in range(8))
        candidate = f"{prefix}{suffix}"
        existing = (
            await db.execute(select(User.id).where(User.username == candidate))
        ).scalar_one_or_none()
        if not existing:
            username = candidate
            break
    if not username:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Login generatsiya qila olmadim",
        )
    password = username

    user = User(
        username=username,
        password_hash=await hash_password_async(password, temporary=True),
        role=UserRole.STUDENT,
        is_active=True,
        first_name=first_name,
        last_name=last_name,
        middle_name=middle_name,
        email=payload.get("email"),
        phone=payload.get("phone"),
        must_change_password=True,
    )
    db.add(user)
    await db.flush()

    student = Student(
        user_id=user.id,
        hemis_id=hemis_id,
        gender=payload.get("gender"),
        region=payload.get("region"),
        district=payload.get("district"),
        group_id=group_id,
        current_semester=payload.get("current_semester"),
        enrollment_year=payload.get("enrollment_year"),
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
        raise HTTPException(status.HTTP_409_CONFLICT, "Username yoki Talaba ID band") from e

    return await get_student(db, student.id)


async def update_student(db: AsyncSession, id_: UUID, data: BaseModel) -> dict[str, Any]:
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
        "hemis_id",
        "enrollment_year",
        "gender",
        "region",
        "district",
        "group_id",
        "current_semester",
        "is_graduating",
        "education_language",
        "education_form",
        "degree_type",
        "status",
    )
    group_changed = "group_id" in payload and payload["group_id"] != student.group_id
    for key in student_keys:
        if key in payload:
            setattr(student, key, payload[key])

    # Guruh XATO TUZATISH uchun o'zgartirilsa — faol (draft/active) biriktirishlar
    # snapshot'i ham yangilanadi, lekin faqat O'SHA YIL doirasida: kelgusi yilga
    # o'tkazish hech qachon eski yil tarixini qayta yozmaydi. Yakunlangan/bekor
    # qilingan biriktirishlar muzlagan qoladi.
    if group_changed:
        new_group = await db.get(Group, payload["group_id"]) if payload["group_id"] else None
        stmt = select(PracticeAssignment).where(
            PracticeAssignment.student_id == student.id,
            PracticeAssignment.status.in_([AssignmentStatus.DRAFT, AssignmentStatus.ACTIVE]),
        )
        if new_group:
            stmt = stmt.where(PracticeAssignment.academic_year_id == new_group.academic_year_id)
        for asn in (await db.execute(stmt)).scalars():
            asn.group_id = new_group.id if new_group else None
            asn.course = new_group.course if new_group else None

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Bu Amaliyot ID boshqa talabada mavjud yoki ma'lumot mos emas",
        ) from e

    return await get_student(db, id_)


async def reset_device(db: AsyncSession, id_: UUID) -> dict[str, Any]:
    """Admin: talabaning bog'langan qurilmasini o'chiradi.

    Shundan keyin talaba istalgan yangi qurilmadan kirib, qayta bog'lanadi.
    """
    student = await db.get(Student, id_)
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Talaba topilmadi: {id_}")
    user = await db.get(User, student.user_id)
    if user:
        user.device_id = None
        user.device_label = None
        user.device_bound_at = None
        user.device_info = None
        # Eski qurilmadagi sessiya ham yopiladi — faqat yangi qurilma bog'lanadi
        from app.services.auth import revoke_all_refresh_tokens

        await revoke_all_refresh_tokens(db, user.id)
        await db.commit()
    return await get_student(db, id_)


async def delete_student(db: AsyncSession, id_: UUID) -> None:
    """Admin: talaba va u bilan bog'liq User'ni o'chirish.

    `practice_assignments.student_id` ON DELETE CASCADE — o'chirilsa amaliyot tarixi (davomat,
    topshiriqlar, yakuniy baho, arizalar) ham jim yo'qolardi. Shuning uchun amaliyot yoki arizasi
    bor talaba o'chirilmaydi: statusini "haydalgan/bitirgan" qilish kerak.
    """
    from app.models.practice_application import PracticeApplication

    student = await db.get(Student, id_)
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Talaba topilmadi: {id_}")
    has_history = (
        await db.execute(
            select(PracticeAssignment.id).where(PracticeAssignment.student_id == id_).limit(1)
        )
    ).scalar_one_or_none() or (
        await db.execute(
            select(PracticeApplication.id).where(PracticeApplication.student_id == id_).limit(1)
        )
    ).scalar_one_or_none()
    if has_history:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Talabaning amaliyot yoki ariza tarixi bor — o'chirib bo'lmaydi. "
            "O'rniga talaba statusini o'zgartiring (bitirgan / haydalgan).",
        )
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


# ─── Ommaviy qurilma uzish ────────────────────────────────


def _device_scope_stmt(data: Any, user: User) -> Any:
    """Qamrovdagi talabalarning `User.id` lari — fakultet admini doirasi bilan."""
    from app.services.scoping import is_faculty_scoped

    stmt = (
        select(User.id)
        .select_from(Student)
        .join(User, User.id == Student.user_id)
        .outerjoin(Group, Group.id == Student.group_id)
        .outerjoin(Direction, Direction.id == Group.direction_id)
    )
    faculty_id = data.faculty_id if data.scope == "faculty" else None
    if is_faculty_scoped(user):
        # Fakultet admini: "barchasi" ham faqat o'z fakulteti
        if faculty_id and faculty_id != user.faculty_id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, "Bu amal faqat o'z fakultetingiz doirasida mumkin"
            )
        faculty_id = user.faculty_id
    if faculty_id:
        stmt = stmt.where(Direction.faculty_id == faculty_id)
    if data.scope == "group":
        stmt = stmt.where(Student.group_id == data.group_id)
    if data.scope == "students":
        stmt = stmt.where(Student.id.in_(data.student_ids or []))
    return stmt


#: Audit yozuvida saqlanadigan uzilgan foydalanuvchi ID'lari soni
DEVICE_RESET_SAMPLE = 300


async def bulk_reset_devices(db: AsyncSession, data: Any, user: User) -> dict[str, Any]:
    """Qamrovdagi talabalarning bog'langan qurilmalarini uzadi va sessiyalarini yopadi.

    Minglab talaba bo'lishi mumkin — ID ro'yxatlari Python'ga olinmaydi (asyncpg parametr
    chegarasi), hammasi subquery orqali bitta UPDATE bilan bajariladi.

    Qaytaradi: {students_total, bound, reset, faculty_name, group_name, user_ids (namuna)}.
    dry_run=True — faqat hisoblaydi. Commit qilmaydi — caller audit yozib commit qiladi.
    """
    from app.models.refresh_token import RefreshToken

    scope_ids = _device_scope_stmt(data, user).subquery()
    in_scope = User.id.in_(select(scope_ids.c.id))
    bound_cond = (in_scope, User.device_id.is_not(None))

    students_total = int(
        (await db.execute(select(func.count()).select_from(scope_ids))).scalar_one()
    )
    bound = int((await db.execute(select(func.count(User.id)).where(*bound_cond))).scalar_one())
    sample = list(
        (await db.execute(select(User.id).where(*bound_cond).limit(DEVICE_RESET_SAMPLE)))
        .scalars()
        .all()
    )

    faculty_name = group_name = None
    if data.scope == "faculty" and data.faculty_id:
        faculty_name = (
            await db.execute(select(Faculty.name).where(Faculty.id == data.faculty_id))
        ).scalar_one_or_none()
    if data.scope == "group" and data.group_id:
        group_name = (
            await db.execute(select(Group.name).where(Group.id == data.group_id))
        ).scalar_one_or_none()

    reset = 0
    if not data.dry_run and bound:
        now = datetime.now(UTC)
        # Avval sessiyalar (shart device_id ga bog'liq — foydalanuvchilar yangilanishidan oldin)
        await db.execute(
            update(RefreshToken)
            .where(
                RefreshToken.user_id.in_(select(User.id).where(*bound_cond)),
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )
        result = await db.execute(
            update(User)
            .where(*bound_cond)
            .values(device_id=None, device_label=None, device_bound_at=None, device_info=None)
            .execution_options(synchronize_session=False)
        )
        reset = int(getattr(result, "rowcount", 0) or 0)

    return {
        "students_total": students_total,
        "bound": bound,
        "reset": reset,
        "faculty_name": faculty_name,
        "group_name": group_name,
        "user_ids": sample,
    }
