"""CSV export — talabalar, davomat, biriktirishlar uchun.

UTF-8 BOM bilan — Excel ochishi uchun. Qator ajratuvchi: \\r\\n.
"""

import csv
import io
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.academic import Direction, Faculty, Group
from app.models.area import Area
from app.models.attendance import AttendanceDay
from app.models.enums import AttendanceDayStatus, FinalReportStatus, StudentStatus
from app.models.final_report import FinalReport
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


def _apply_student_filters(  # type: ignore[no-untyped-def]
    stmt,
    *,
    faculty_id: UUID | None,
    direction_id: UUID | None,
    group_id: UUID | None,
    course: int | None,
    academic_year_id: UUID | None,
    status: StudentStatus | None,
    search: str | None,
):
    """Talabalar ro'yxati/eksporti uchun umumiy filtrlar."""
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
    return stmt


async def export_student_credentials(
    db: AsyncSession,
    *,
    faculty_id: UUID | None = None,
    direction_id: UUID | None = None,
    group_id: UUID | None = None,
    course: int | None = None,
    academic_year_id: UUID | None = None,
    status: StudentStatus | None = None,
    search: str | None = None,
) -> list[dict[str, Any]]:
    """Talabalar login/parol jadvali uchun ma'lumot (DB'dan, istalgan vaqtda).

    Boshlang'ich parol = login (services/hemis.py va services/student.py shunday
    yaratadi). `must_change_password` False bo'lsa — talaba parolni o'zgartirgan,
    boshlang'ich parol endi amal qilmaydi.
    """
    stmt = (
        select(
            Student.hemis_id.label("amaliyot_id"),
            User.username,
            User.must_change_password,
            User.last_name,
            User.first_name,
            User.middle_name,
            Faculty.name.label("faculty_name"),
            Direction.name.label("direction_name"),
            Group.name.label("group_name"),
            Group.course,
        )
        .join(User, User.id == Student.user_id)
        .outerjoin(Group, Group.id == Student.group_id)
        .outerjoin(Direction, Direction.id == Group.direction_id)
        .outerjoin(Faculty, Faculty.id == Direction.faculty_id)
        .order_by(Faculty.name, Group.name, User.last_name, User.first_name)
    )
    stmt = _apply_student_filters(
        stmt,
        faculty_id=faculty_id,
        direction_id=direction_id,
        group_id=group_id,
        course=course,
        academic_year_id=academic_year_id,
        status=status,
        search=search,
    )
    rows = (await db.execute(stmt)).all()
    return [
        {
            "amaliyot_id": r.amaliyot_id,
            "full_name": " ".join(
                p for p in (r.last_name, r.first_name, r.middle_name) if p
            ),
            "faculty_name": r.faculty_name,
            "direction_name": r.direction_name,
            "group_name": r.group_name,
            "course": r.course,
            "username": r.username,
            "password_changed": not r.must_change_password,
        }
        for r in rows
    ]


async def export_students(
    db: AsyncSession,
    *,
    faculty_id: UUID | None = None,
    direction_id: UUID | None = None,
    group_id: UUID | None = None,
    course: int | None = None,
    academic_year_id: UUID | None = None,
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

    stmt = _apply_student_filters(
        stmt,
        faculty_id=faculty_id,
        direction_id=direction_id,
        group_id=group_id,
        course=course,
        academic_year_id=academic_year_id,
        status=status,
        search=search,
    )

    rows = (await db.execute(stmt)).all()
    headers = [
        "Amaliyot ID",
        "Familiya",
        "Ism",
        "Otasining ismi",
        "Jinsi",
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
    academic_year_id: UUID | None = None,
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
        .outerjoin(Group, Group.id == PracticeAssignment.group_id)
        .outerjoin(Direction, Direction.id == Group.direction_id)
        .outerjoin(Faculty, Faculty.id == Direction.faculty_id)
        .outerjoin(Organization, Organization.id == PracticeAssignment.organization_id)
        .outerjoin(Area, Area.id == PracticeAssignment.area_id)
        .order_by(AttendanceDay.date.desc(), User.last_name)
    )
    if academic_year_id:
        stmt = stmt.where(PracticeAssignment.academic_year_id == academic_year_id)
    if assignment_id:
        stmt = stmt.where(AttendanceDay.assignment_id == assignment_id)
    if student_id:
        stmt = stmt.where(Student.id == student_id)
    if status:
        stmt = stmt.where(AttendanceDay.status == status)
    if group_id:
        stmt = stmt.where(PracticeAssignment.group_id == group_id)
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
    *,
    academic_year_id: UUID | None = None,
) -> bytes:
    stmt = (
        select(
            PracticeAssignment.id,
            User.last_name,
            User.first_name,
            Student.hemis_id,
            Group.name.label("group_name"),
            PracticeAssignment.course,
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
        .outerjoin(Group, Group.id == PracticeAssignment.group_id)
        .join(PracticeType, PracticeType.id == PracticeAssignment.practice_type_id)
        .outerjoin(Organization, Organization.id == PracticeAssignment.organization_id)
        .outerjoin(Area, Area.id == PracticeAssignment.area_id)
        .order_by(User.last_name, User.first_name)
    )
    if academic_year_id:
        stmt = stmt.where(PracticeAssignment.academic_year_id == academic_year_id)
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


_FINAL_REPORT_STATUS_LABEL = {
    FinalReportStatus.DRAFT: "Qoralama",
    FinalReportStatus.SUBMITTED: "Kutilmoqda",
    FinalReportStatus.APPROVED: "Tasdiqlangan",
    FinalReportStatus.REJECTED: "Rad etilgan",
}


async def export_final_reports(
    db: AsyncSession,
    *,
    academic_year_id: UUID | None = None,
    status: FinalReportStatus | None = None,
    group_id: UUID | None = None,
    direction_id: UUID | None = None,
    faculty_id: UUID | None = None,
    course: int | None = None,
    search: str | None = None,
) -> bytes:
    reviewer = aliased(User)
    stmt = (
        select(
            Student.hemis_id,
            User.last_name,
            User.first_name,
            Faculty.name.label("faculty_name"),
            Direction.name.label("direction_name"),
            Group.name.label("group_name"),
            PracticeAssignment.course,
            PracticeType.name.label("practice_type_name"),
            FinalReport.title,
            FinalReport.status,
            PracticeAssignment.final_grade,
            PracticeAssignment.credit_earned,
            FinalReport.submitted_at,
            FinalReport.reviewed_at,
            reviewer.last_name.label("reviewer_last"),
            reviewer.first_name.label("reviewer_first"),
            FinalReport.reviewer_note,
        )
        .join(PracticeAssignment, PracticeAssignment.id == FinalReport.assignment_id)
        .join(Student, Student.id == PracticeAssignment.student_id)
        .join(User, User.id == Student.user_id)
        .outerjoin(Group, Group.id == PracticeAssignment.group_id)
        .outerjoin(Direction, Direction.id == Group.direction_id)
        .outerjoin(Faculty, Faculty.id == Direction.faculty_id)
        .join(PracticeType, PracticeType.id == PracticeAssignment.practice_type_id)
        .outerjoin(reviewer, reviewer.id == FinalReport.reviewer_id)
        .order_by(Group.name, User.last_name, User.first_name)
    )
    if academic_year_id:
        stmt = stmt.where(PracticeAssignment.academic_year_id == academic_year_id)
    if status:
        stmt = stmt.where(FinalReport.status == status)
    if group_id:
        stmt = stmt.where(PracticeAssignment.group_id == group_id)
    if direction_id:
        stmt = stmt.where(Group.direction_id == direction_id)
    if faculty_id:
        stmt = stmt.where(Direction.faculty_id == faculty_id)
    if course is not None:
        stmt = stmt.where(PracticeAssignment.course == course)
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
        "Fakultet",
        "Yo'nalish",
        "Guruh",
        "Kurs",
        "Amaliyot turi",
        "Hisobot nomi",
        "Status",
        "Yakuniy ball",
        "Kredit",
        "Topshirilgan",
        "Ko'rib chiqilgan",
        "Ko'ruvchi",
        "Izoh",
    ]
    data: list[list[Any]] = []
    for r in rows:
        m = r._mapping
        status_label = _FINAL_REPORT_STATUS_LABEL.get(m["status"], m["status"])
        reviewer_name = (
            f"{m['reviewer_last'] or ''} {m['reviewer_first'] or ''}".strip() or None
        )
        data.append(
            [
                m["hemis_id"],
                m["last_name"],
                m["first_name"],
                m["faculty_name"],
                m["direction_name"],
                m["group_name"],
                m["course"],
                m["practice_type_name"],
                m["title"],
                status_label,
                m["final_grade"],
                "Ha" if m["credit_earned"] else "Yo'q",
                m["submitted_at"].strftime("%Y-%m-%d %H:%M") if m["submitted_at"] else None,
                m["reviewed_at"].strftime("%Y-%m-%d %H:%M") if m["reviewed_at"] else None,
                reviewer_name,
                m["reviewer_note"],
            ]
        )
    return _to_csv(headers, data)
