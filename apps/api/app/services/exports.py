"""CSV export — talabalar, davomat, biriktirishlar uchun.

UTF-8 BOM bilan — Excel ochishi uchun. Qator ajratuvchi: \\r\\n.
"""

import csv
import io
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import Direction, Faculty, Group
from app.models.area import Area
from app.models.attendance import AttendanceDay
from app.models.enums import AttendanceDayStatus, StudentStatus
from app.models.organization import Organization
from app.models.practice_assignment import PracticeAssignment
from app.models.practice_type import PracticeType
from app.models.student import Student
from app.models.supervisor import Supervisor
from app.models.user import User


def _to_csv(headers: list[str], rows: list[list[Any]]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=",", quoting=csv.QUOTE_MINIMAL, lineterminator="\r\n")
    writer.writerow(headers)
    for row in rows:
        writer.writerow(["" if v is None else str(v) for v in row])
    return ("﻿" + buf.getvalue()).encode("utf-8")


async def export_students(
    db: AsyncSession,
    *,
    faculty_id: UUID | None = None,
    direction_id: UUID | None = None,
    group_id: UUID | None = None,
    course: int | None = None,
    status: StudentStatus | None = None,
    search: str | None = None,
) -> bytes:
    stmt = (
        select(
            Student.hemis_id,
            User.last_name,
            User.first_name,
            User.middle_name,
            Student.gender,
            Student.birth_date,
            Student.jshshir,
            Student.passport_number,
            Student.region,
            Student.district,
            Faculty.name.label("faculty_name"),
            Direction.code.label("direction_code"),
            Direction.name.label("direction_name"),
            Group.name.label("group_name"),
            Group.course,
            Student.education_form,
            Student.degree_type,
            Student.status,
            User.email,
            User.phone,
        )
        .join(User, User.id == Student.user_id)
        .outerjoin(Group, Group.id == Student.group_id)
        .outerjoin(Direction, Direction.id == Group.direction_id)
        .outerjoin(Faculty, Faculty.id == Direction.faculty_id)
        .order_by(User.last_name, User.first_name)
    )

    if faculty_id:
        stmt = stmt.where(Direction.faculty_id == faculty_id)
    if direction_id:
        stmt = stmt.where(Group.direction_id == direction_id)
    if group_id:
        stmt = stmt.where(Student.group_id == group_id)
    if course is not None:
        stmt = stmt.where(Group.course == course)
    if status:
        stmt = stmt.where(Student.status == status)
    if search:
        from sqlalchemy import func, or_

        like = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.first_name).like(like),
                func.lower(User.last_name).like(like),
                Student.hemis_id.like(f"%{search}%"),
            )
        )

    rows = (await db.execute(stmt)).all()
    headers = [
        "HEMIS ID",
        "Familiya",
        "Ism",
        "Otasining ismi",
        "Jinsi",
        "Tug'ilgan sana",
        "JSHSHIR",
        "Pasport",
        "Viloyat",
        "Tuman",
        "Fakultet",
        "Yo'nalish kodi",
        "Yo'nalish nomi",
        "Guruh",
        "Kurs",
        "Ta'lim shakli",
        "Daraja",
        "Status",
        "Email",
        "Telefon",
    ]
    data = [list(r) for r in rows]
    return _to_csv(headers, data)


async def export_attendance(
    db: AsyncSession,
    *,
    assignment_id: UUID | None = None,
    student_id: UUID | None = None,
    status: AttendanceDayStatus | None = None,
    group_id: UUID | None = None,
    direction_id: UUID | None = None,
    faculty_id: UUID | None = None,
    date_from: Any = None,
    date_to: Any = None,
) -> bytes:
    stmt = (
        select(
            AttendanceDay.date,
            User.last_name,
            User.first_name,
            Student.hemis_id,
            Faculty.name.label("faculty_name"),
            Direction.name.label("direction_name"),
            Group.name.label("group_name"),
            Organization.name.label("organization_name"),
            Area.name.label("area_name"),
            AttendanceDay.status,
            AttendanceDay.check_in_at,
            AttendanceDay.check_out_at,
            AttendanceDay.note,
        )
        .join(PracticeAssignment, PracticeAssignment.id == AttendanceDay.assignment_id)
        .join(Student, Student.id == PracticeAssignment.student_id)
        .join(User, User.id == Student.user_id)
        .outerjoin(Group, Group.id == Student.group_id)
        .outerjoin(Direction, Direction.id == Group.direction_id)
        .outerjoin(Faculty, Faculty.id == Direction.faculty_id)
        .outerjoin(Organization, Organization.id == PracticeAssignment.organization_id)
        .outerjoin(Area, Area.id == PracticeAssignment.area_id)
        .order_by(AttendanceDay.date.desc(), User.last_name)
    )
    if assignment_id:
        stmt = stmt.where(AttendanceDay.assignment_id == assignment_id)
    if student_id:
        stmt = stmt.where(Student.id == student_id)
    if status:
        stmt = stmt.where(AttendanceDay.status == status)
    if group_id:
        stmt = stmt.where(Student.group_id == group_id)
    if direction_id:
        stmt = stmt.where(Group.direction_id == direction_id)
    if faculty_id:
        stmt = stmt.where(Direction.faculty_id == faculty_id)
    if date_from:
        stmt = stmt.where(AttendanceDay.date >= date_from)
    if date_to:
        stmt = stmt.where(AttendanceDay.date <= date_to)

    rows = (await db.execute(stmt)).all()
    headers = [
        "Sana",
        "Familiya",
        "Ism",
        "HEMIS ID",
        "Fakultet",
        "Yo'nalish",
        "Guruh",
        "Tashkilot",
        "Hudud",
        "Status",
        "Kelish vaqti",
        "Ketish vaqti",
        "Izoh",
    ]
    data = [list(r) for r in rows]
    return _to_csv(headers, data)


async def export_assignments(
    db: AsyncSession,
) -> bytes:
    stmt = (
        select(
            PracticeAssignment.id,
            User.last_name,
            User.first_name,
            Student.hemis_id,
            Group.name.label("group_name"),
            Group.course,
            PracticeType.name.label("practice_type_name"),
            Organization.name.label("organization_name"),
            Area.name.label("area_name"),
            PracticeAssignment.start_date,
            PracticeAssignment.end_date,
            PracticeAssignment.status,
            PracticeAssignment.final_grade,
            PracticeAssignment.credit_earned,
        )
        .join(Student, Student.id == PracticeAssignment.student_id)
        .join(User, User.id == Student.user_id)
        .outerjoin(Group, Group.id == Student.group_id)
        .join(PracticeType, PracticeType.id == PracticeAssignment.practice_type_id)
        .outerjoin(Organization, Organization.id == PracticeAssignment.organization_id)
        .outerjoin(Area, Area.id == PracticeAssignment.area_id)
        .order_by(User.last_name, User.first_name)
    )
    rows = (await db.execute(stmt)).all()
    headers = [
        "Assignment ID",
        "Familiya",
        "Ism",
        "HEMIS ID",
        "Guruh",
        "Kurs",
        "Amaliyot turi",
        "Tashkilot",
        "Hudud",
        "Boshlanish",
        "Tugash",
        "Status",
        "Yakuniy ball",
        "Kredit",
    ]
    data = [list(r) for r in rows]
    # supervisor_id keyin qo'shilishi mumkin — alohida JOIN
    _ = Supervisor
    return _to_csv(headers, data)
