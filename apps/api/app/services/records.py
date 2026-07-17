"""Qaydnomalar — talabalar amaliyot baholarining admin-keng agregatsiyasi.

Har bir biriktirish uchun: talaba, mutaxassislik, guruh, kurs, amaliyot nomi,
korxona, muddat, davomat %, korxona bahosi (topshiriq ballari), qaydnoma bahosi
(yakuniy ball). Davomat va topshiriq ballari attendance/task'lardan agregatlanadi.
"""

from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import Direction, Group
from app.models.area import Area
from app.models.attendance import AttendanceDay
from app.models.enums import AttendanceDayStatus, DegreeType, EducationForm
from app.models.organization import Organization
from app.models.practice_assignment import PracticeAssignment
from app.models.practice_type import PracticeType
from app.models.student import Student
from app.models.supervisor import Supervisor
from app.models.task import Task, TaskTemplate
from app.models.user import User
from app.services.attendance_stats import compute_percent

_SEMESTER_LABEL = {"fall": "Kuzgi", "spring": "Bahorgi"}


async def list_records(
    db: AsyncSession,
    *,
    academic_year_id: UUID | None = None,
    direction_id: UUID | None = None,
    course: int | None = None,
    group_id: UUID | None = None,
    supervisor_id: UUID | None = None,
    education_form: EducationForm | None = None,
    degree_type: DegreeType | None = None,
    start_from: date | None = None,
    end_to: date | None = None,
    search: str | None = None,
) -> list[dict[str, Any]]:
    sup_user = User.__table__.alias("sup_user")
    stmt = (
        select(
            PracticeAssignment.id,
            (User.last_name + " " + User.first_name).label("student_name"),
            Direction.name.label("direction_name"),
            Direction.code.label("direction_code"),
            Group.name.label("group_name"),
            PracticeAssignment.course,
            Student.education_form,
            Student.degree_type,
            PracticeType.name.label("practice_type_name"),
            Organization.name.label("organization_name"),
            Area.name.label("area_name"),
            PracticeAssignment.start_date,
            PracticeAssignment.end_date,
            PracticeAssignment.semester,
            PracticeAssignment.required_weekdays,
            PracticeAssignment.final_grade,
            PracticeAssignment.credit_earned,
            PracticeAssignment.status,
            (sup_user.c.last_name + " " + sup_user.c.first_name).label("supervisor_name"),
        )
        .join(Student, Student.id == PracticeAssignment.student_id)
        .join(User, User.id == Student.user_id)
        .join(PracticeType, PracticeType.id == PracticeAssignment.practice_type_id)
        .outerjoin(Group, Group.id == PracticeAssignment.group_id)
        .outerjoin(Direction, Direction.id == Group.direction_id)
        .outerjoin(Organization, Organization.id == PracticeAssignment.organization_id)
        .outerjoin(Area, Area.id == PracticeAssignment.area_id)
        .outerjoin(Supervisor, Supervisor.id == PracticeAssignment.supervisor_id)
        .outerjoin(sup_user, sup_user.c.id == Supervisor.user_id)
    )

    if academic_year_id:
        stmt = stmt.where(PracticeAssignment.academic_year_id == academic_year_id)
    if direction_id:
        stmt = stmt.where(Group.direction_id == direction_id)
    if course is not None:
        stmt = stmt.where(PracticeAssignment.course == course)
    if group_id:
        stmt = stmt.where(PracticeAssignment.group_id == group_id)
    if supervisor_id:
        stmt = stmt.where(PracticeAssignment.supervisor_id == supervisor_id)
    if education_form:
        stmt = stmt.where(Student.education_form == education_form)
    if degree_type:
        stmt = stmt.where(Student.degree_type == degree_type)
    if start_from:
        stmt = stmt.where(PracticeAssignment.start_date >= start_from)
    if end_to:
        stmt = stmt.where(PracticeAssignment.end_date <= end_to)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            func.lower(User.last_name).like(like) | func.lower(User.first_name).like(like)
        )

    stmt = stmt.order_by(Group.name, User.last_name, User.first_name)
    result = (await db.execute(stmt)).all()
    assignment_ids = [r.id for r in result]

    # Davomat agregatsiyasi
    att_map: dict[Any, dict[str, int]] = {}
    if assignment_ids:
        for aid, st, cnt in (
            await db.execute(
                select(
                    AttendanceDay.assignment_id,
                    AttendanceDay.status,
                    func.count(AttendanceDay.id),
                )
                .where(AttendanceDay.assignment_id.in_(assignment_ids))
                .group_by(AttendanceDay.assignment_id, AttendanceDay.status)
            )
        ).all():
            entry = att_map.setdefault(aid, {"green": 0, "total": 0})
            entry["total"] += cnt
            if st == AttendanceDayStatus.GREEN:
                entry["green"] += cnt

    # Topshiriq (korxona) ballari
    pts_map: dict[Any, dict[str, int]] = {}
    if assignment_ids:
        for aid, earned, max_pts in (
            await db.execute(
                select(
                    Task.assignment_id,
                    func.coalesce(func.sum(Task.points_earned), 0),
                    func.coalesce(func.sum(TaskTemplate.points), 0),
                )
                .join(TaskTemplate, TaskTemplate.id == Task.template_id)
                .where(Task.assignment_id.in_(assignment_ids))
                .group_by(Task.assignment_id)
            )
        ).all():
            pts_map[aid] = {"earned": int(earned), "max": int(max_pts)}

    rows: list[dict[str, Any]] = []
    for r in result:
        att = att_map.get(r.id, {"green": 0, "total": 0})
        pts = pts_map.get(r.id)
        rows.append(
            {
                "assignment_id": r.id,
                "student_name": r.student_name,
                "direction_name": r.direction_name,
                "direction_code": r.direction_code,
                "group_name": r.group_name,
                "course": r.course,
                "education_form": r.education_form.value if r.education_form else None,
                "practice_type_name": r.practice_type_name,
                "object_name": r.organization_name or r.area_name,
                "supervisor_name": (r.supervisor_name or "").strip() or None,
                "start_date": r.start_date,
                "end_date": r.end_date,
                "semester": r.semester.value if r.semester else None,
                "semester_label": _SEMESTER_LABEL.get(r.semester.value) if r.semester else None,
                "attendance_pct": compute_percent(
                    green=att["green"],
                    record_total=att["total"],
                    start=r.start_date,
                    end=r.end_date,
                    weekdays=r.required_weekdays,
                ),
                "korxona_grade": pts["earned"] if pts else None,
                "korxona_grade_max": pts["max"] if pts else None,
                "qaydnoma_grade": r.final_grade,
                "credit_earned": r.credit_earned,
            }
        )
    return rows
