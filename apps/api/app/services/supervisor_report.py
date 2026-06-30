"""Supervizor talabalar yakuniy hisoboti — PDF uchun ma'lumot yig'ish."""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.academic import Group
from app.models.area import Area
from app.models.attendance import AttendanceDay
from app.models.enums import AssignmentStatus, AttendanceDayStatus
from app.models.organization import Organization
from app.models.practice_assignment import PracticeAssignment
from app.models.practice_type import PracticeType
from app.models.student import Student
from app.models.supervisor import Supervisor, SupervisorOrganization
from app.models.task import Task, TaskTemplate
from app.models.user import User
from app.services import pdf as pdf_svc

_STATUS_LABEL = {
    AssignmentStatus.DRAFT: "Qoralama",
    AssignmentStatus.ACTIVE: "Aktiv",
    AssignmentStatus.COMPLETED: "Tugagan",
    AssignmentStatus.CANCELLED: "Bekor",
}


async def build_context(db: AsyncSession, user: User) -> dict[str, Any]:
    """Joriy supervizorning barcha talabalari bo'yicha hisobot konteksti."""
    supervisor_ids = (
        (await db.execute(select(Supervisor.id).where(Supervisor.user_id == user.id)))
        .scalars()
        .all()
    )

    supervisor_name = f"{user.last_name or ''} {user.first_name or ''}".strip() or user.username
    position: str | None = None
    organization_name: str | None = None

    if supervisor_ids:
        sup = (
            await db.execute(
                select(Supervisor.position).where(Supervisor.id == supervisor_ids[0])
            )
        ).first()
        if sup:
            position = sup[0]
        # Biriktirilgan tashkilot(lar) — birinchisini ko'rsatamiz
        org_names = (
            (
                await db.execute(
                    select(Organization.name)
                    .join(
                        SupervisorOrganization,
                        SupervisorOrganization.organization_id == Organization.id,
                    )
                    .where(SupervisorOrganization.supervisor_id == supervisor_ids[0])
                    .order_by(Organization.name)
                )
            )
            .scalars()
            .all()
        )
        if org_names:
            organization_name = ", ".join(org_names)

    rows: list[dict[str, Any]] = []
    if supervisor_ids:
        # Asosiy biriktirishlar ro'yxati
        result = (
            await db.execute(
                select(
                    PracticeAssignment.id,
                    User.last_name,
                    User.first_name,
                    User.middle_name,
                    Student.hemis_id,
                    Group.name.label("group_name"),
                    Group.course,
                    PracticeType.name.label("practice_type_name"),
                    Organization.name.label("organization_name"),
                    Area.name.label("area_name"),
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
                .where(PracticeAssignment.supervisor_id.in_(supervisor_ids))
                .order_by(Group.name, User.last_name, User.first_name)
            )
        ).all()

        assignment_ids = [r.id for r in result]

        # Davomat agregatsiyasi (assignment_id → {green, total})
        att_map: dict[Any, dict[str, int]] = {}
        if assignment_ids:
            att_rows = (
                await db.execute(
                    select(
                        AttendanceDay.assignment_id,
                        AttendanceDay.status,
                        func.count(AttendanceDay.id),
                    )
                    .where(AttendanceDay.assignment_id.in_(assignment_ids))
                    .group_by(AttendanceDay.assignment_id, AttendanceDay.status)
                )
            ).all()
            for aid, st, cnt in att_rows:
                entry = att_map.setdefault(aid, {"green": 0, "total": 0})
                entry["total"] += cnt
                if st == AttendanceDayStatus.GREEN:
                    entry["green"] += cnt

        # Topshiriq ballari (assignment_id → {earned, max})
        pts_map: dict[Any, dict[str, int]] = {}
        if assignment_ids:
            pts_rows = (
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
            ).all()
            for aid, earned, max_pts in pts_rows:
                pts_map[aid] = {"earned": int(earned), "max": int(max_pts)}

        for r in result:
            middle = f" {r.middle_name}" if r.middle_name else ""
            att = att_map.get(r.id, {"green": 0, "total": 0})
            pts = pts_map.get(r.id, {"earned": 0, "max": 0})
            att_pct = round(att["green"] / att["total"] * 100) if att["total"] else None
            rows.append(
                {
                    "student_name": f"{r.last_name} {r.first_name}{middle}".strip(),
                    "hemis_id": r.hemis_id,
                    "group_name": r.group_name,
                    "course": r.course,
                    "practice_type_name": r.practice_type_name,
                    "object_name": r.organization_name or r.area_name,
                    "attendance_green": att["green"],
                    "attendance_total": att["total"],
                    "attendance_pct": att_pct,
                    "points_earned": pts["earned"],
                    "points_max": pts["max"],
                    "final_grade": r.final_grade,
                    "credit_earned": r.credit_earned,
                    "status_label": _STATUS_LABEL.get(r.status, r.status),
                }
            )

    credit_count = sum(1 for r in rows if r["credit_earned"])
    graded = [r["final_grade"] for r in rows if r["final_grade"] is not None]
    avg_grade = round(sum(graded) / len(graded), 1) if graded else "—"

    return {
        "supervisor_name": supervisor_name,
        "supervisor_position": position,
        "organization_name": organization_name,
        "generated_at": datetime.now(UTC).strftime("%Y-%m-%d %H:%M"),
        "rows": rows,
        "credit_count": credit_count,
        "avg_grade": avg_grade,
        "app_name": settings.APP_NAME,
    }


async def render_pdf(db: AsyncSession, user: User) -> bytes:
    context = await build_context(db, user)
    return pdf_svc.render_supervisor_report_pdf(context)
