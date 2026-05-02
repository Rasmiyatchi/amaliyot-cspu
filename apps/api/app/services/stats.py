"""Stats service — rol'ga qarab KPI'lar va recent activity.

Har rol uchun o'ziga xos ko'rsatkichlar. Soddalashtirilgan — MVP uchun yetadi.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import AttendanceDay, AttendanceOverride
from app.models.contract import Contract
from app.models.enums import (
    AssignmentStatus,
    AttendanceDayStatus,
    ContractStatus,
    JournalStatus,
    StudentStatus,
    TaskStatus,
)
from app.models.practice_assignment import PracticeAssignment
from app.models.student import Student
from app.models.supervisor import Supervisor
from app.models.task import JournalEntry, LessonAnalysis, Task, TaskTemplate
from app.models.user import User


async def _capacity_alerts(db: AsyncSession) -> list[dict[str, Any]]:
    """Sig'imi yaqin yoki to'lib ketgan obyektlarni topadi.

    Threshold: capacity ning 80%+ band bo'lgan obyektlar alert sifatida qaytariladi.
    """
    from app.models.organization import Organization

    active_statuses = (AssignmentStatus.DRAFT, AssignmentStatus.ACTIVE)

    org_rows = (
        await db.execute(
            select(
                Organization.id,
                Organization.name,
                Organization.capacity,
                func.count(PracticeAssignment.id).label("used"),
            )
            .outerjoin(
                PracticeAssignment,
                (PracticeAssignment.organization_id == Organization.id)
                & PracticeAssignment.status.in_(active_statuses),
            )
            .where(Organization.is_active.is_(True))
            .group_by(Organization.id, Organization.name, Organization.capacity)
        )
    ).mappings().all()

    sup_rows = (
        await db.execute(
            select(
                Supervisor.id,
                User.last_name,
                User.first_name,
                Supervisor.capacity,
                func.count(PracticeAssignment.id).label("used"),
            )
            .join(User, User.id == Supervisor.user_id)
            .outerjoin(
                PracticeAssignment,
                (PracticeAssignment.supervisor_id == Supervisor.id)
                & PracticeAssignment.status.in_(active_statuses),
            )
            .where(Supervisor.is_active.is_(True))
            .group_by(
                Supervisor.id, User.last_name, User.first_name, Supervisor.capacity
            )
        )
    ).mappings().all()

    alerts: list[dict[str, Any]] = []
    for r in org_rows:
        cap = r["capacity"] or 0
        used = r["used"] or 0
        if cap <= 0:
            continue
        ratio = used / cap
        if ratio >= 0.8:
            alerts.append(
                {
                    "kind": "organization",
                    "id": str(r["id"]),
                    "name": r["name"],
                    "used": used,
                    "capacity": cap,
                    "percent": round(ratio * 100),
                    "severity": "full" if ratio >= 1.0 else "near_full",
                }
            )
    for r in sup_rows:
        cap = r["capacity"] or 0
        used = r["used"] or 0
        if cap <= 0:
            continue
        ratio = used / cap
        if ratio >= 0.8:
            alerts.append(
                {
                    "kind": "supervisor",
                    "id": str(r["id"]),
                    "name": f"{r['last_name']} {r['first_name']}".strip(),
                    "used": used,
                    "capacity": cap,
                    "percent": round(ratio * 100),
                    "severity": "full" if ratio >= 1.0 else "near_full",
                }
            )

    alerts.sort(key=lambda a: -a["percent"])
    return alerts


async def admin_overview(db: AsyncSession) -> dict[str, Any]:
    """Admin bosh sahifasi uchun KPI'lar.

    Talabalar soni, aktiv amaliyotlar, shartnomalar, davomat %, topshiriqlar progress.
    """
    # Students — statusga qarab
    student_rows = (
        await db.execute(
            select(Student.status, func.count(Student.id)).group_by(Student.status)
        )
    ).all()
    students_by_status = {s.value: 0 for s in StudentStatus}
    for s, c in student_rows:
        students_by_status[s.value] = c
    students_total = sum(students_by_status.values())

    # Assignments
    asn_rows = (
        await db.execute(
            select(PracticeAssignment.status, func.count(PracticeAssignment.id))
            .group_by(PracticeAssignment.status)
        )
    ).all()
    assignments_by_status = {s.value: 0 for s in AssignmentStatus}
    for s, c in asn_rows:
        assignments_by_status[s.value] = c

    # Contracts
    contract_rows = (
        await db.execute(
            select(Contract.status, func.count(Contract.id)).group_by(Contract.status)
        )
    ).all()
    contracts_by_status = {s.value: 0 for s in ContractStatus}
    for s, c in contract_rows:
        contracts_by_status[s.value] = c

    # Organizations / supervisors
    from app.models.organization import Organization

    orgs_count = (
        await db.execute(select(func.count()).select_from(Organization))
    ).scalar_one()
    supervisors_count = (
        await db.execute(select(func.count()).select_from(Supervisor))
    ).scalar_one()

    # Attendance — oxirgi 30 kun
    thirty_days_ago = (datetime.now(UTC) - timedelta(days=30)).date()
    att_rows = (
        await db.execute(
            select(AttendanceDay.status, func.count(AttendanceDay.id))
            .where(AttendanceDay.date >= thirty_days_ago)
            .group_by(AttendanceDay.status)
        )
    ).all()
    att = {s.value: 0 for s in AttendanceDayStatus}
    for s, c in att_rows:
        att[s.value] = c
    att_total_recent = sum(att.values())
    att_percent = (
        int(round(att["green"] / att_total_recent * 100))
        if att_total_recent
        else None
    )

    # Tasks overview
    task_rows = (
        await db.execute(
            select(Task.status, func.count(Task.id)).group_by(Task.status)
        )
    ).all()
    tasks_by_status = {s.value: 0 for s in TaskStatus}
    for s, c in task_rows:
        tasks_by_status[s.value] = c

    # Pending reviews (supervisor/admin ko'rishi kerak)
    pending_tasks = tasks_by_status.get("submitted", 0)
    pending_journals = (
        await db.execute(
            select(func.count(JournalEntry.id)).where(
                JournalEntry.status == JournalStatus.SUBMITTED
            )
        )
    ).scalar_one()
    pending_analyses = (
        await db.execute(
            select(func.count(LessonAnalysis.id)).where(
                LessonAnalysis.status == JournalStatus.SUBMITTED
            )
        )
    ).scalar_one()

    return {
        "students": {
            "total": students_total,
            "by_status": students_by_status,
        },
        "assignments": {
            "total": sum(assignments_by_status.values()),
            "by_status": assignments_by_status,
        },
        "contracts": {
            "total": sum(contracts_by_status.values()),
            "by_status": contracts_by_status,
        },
        "organizations": orgs_count,
        "supervisors": supervisors_count,
        "attendance_30d": {
            "total": att_total_recent,
            "green": att["green"],
            "red": att["red"],
            "pending": att["pending"],
            "green_percent": att_percent,
        },
        "tasks": {
            "total": sum(tasks_by_status.values()),
            "by_status": tasks_by_status,
        },
        "pending_reviews": {
            "tasks": pending_tasks,
            "journals": pending_journals,
            "analyses": pending_analyses,
            "total": pending_tasks + pending_journals + pending_analyses,
        },
        "capacity_alerts": await _capacity_alerts(db),
    }


async def super_admin_overview(db: AsyncSession) -> dict[str, Any]:
    """Super admin uchun qo'shimcha ko'rsatkichlar: system health + override queue."""
    base = await admin_overview(db)

    # Recent overrides
    recent_overrides = (
        (
            await db.execute(
                select(
                    AttendanceOverride.id,
                    AttendanceOverride.previous_status,
                    AttendanceOverride.new_status,
                    AttendanceOverride.reason,
                    AttendanceOverride.created_at,
                    (User.last_name + " " + User.first_name).label("admin_name"),
                )
                .join(User, User.id == AttendanceOverride.super_admin_id)
                .order_by(AttendanceOverride.created_at.desc())
                .limit(10)
            )
        )
        .mappings()
        .all()
    )

    users_count = (
        await db.execute(select(func.count()).select_from(User))
    ).scalar_one()

    return {
        **base,
        "users_total": users_count,
        "recent_overrides": [
            {
                "id": str(r["id"]),
                "previous_status": r["previous_status"].value,
                "new_status": r["new_status"].value,
                "reason": r["reason"],
                "created_at": r["created_at"].isoformat(),
                "admin_name": r["admin_name"],
            }
            for r in recent_overrides
        ],
    }


async def supervisor_overview(db: AsyncSession, user: User) -> dict[str, Any]:
    """Supervizor: o'z talabalari bo'yicha KPI'lar."""
    # Supervisorning assignmentlari
    supervisor_rows = (
        (
            await db.execute(
                select(Supervisor.id).where(Supervisor.user_id == user.id)
            )
        )
        .scalars()
        .all()
    )
    if not supervisor_rows:
        return _empty_supervisor_overview()

    assignments = (
        (
            await db.execute(
                select(PracticeAssignment.id).where(
                    PracticeAssignment.supervisor_id.in_(supervisor_rows)
                )
            )
        )
        .scalars()
        .all()
    )
    if not assignments:
        return _empty_supervisor_overview()

    today = datetime.now(UTC).date()

    # Bugungi davomat
    today_days = (
        (
            await db.execute(
                select(AttendanceDay.status, func.count(AttendanceDay.id))
                .where(
                    AttendanceDay.assignment_id.in_(assignments),
                    AttendanceDay.date == today,
                )
                .group_by(AttendanceDay.status)
            )
        )
        .all()
    )
    today_by_status = {s.value: 0 for s in AttendanceDayStatus}
    for s, c in today_days:
        today_by_status[s.value] = c

    # Kutilayotgan tasdiqlar
    pending_tasks = (
        await db.execute(
            select(func.count(Task.id)).where(
                Task.assignment_id.in_(assignments),
                Task.status == TaskStatus.SUBMITTED,
            )
        )
    ).scalar_one()
    pending_journals = (
        await db.execute(
            select(func.count(JournalEntry.id)).where(
                JournalEntry.assignment_id.in_(assignments),
                JournalEntry.status == JournalStatus.SUBMITTED,
            )
        )
    ).scalar_one()
    pending_analyses = (
        await db.execute(
            select(func.count(LessonAnalysis.id)).where(
                LessonAnalysis.assignment_id.in_(assignments),
                LessonAnalysis.status == JournalStatus.SUBMITTED,
            )
        )
    ).scalar_one()

    # Attendance pending (supervizor tasdiqlashi kutilmoqda)
    att_pending = (
        await db.execute(
            select(func.count(AttendanceDay.id)).where(
                AttendanceDay.assignment_id.in_(assignments),
                AttendanceDay.status == AttendanceDayStatus.PENDING,
            )
        )
    ).scalar_one()

    # Jami ball progress (talabalar bo'yicha summa)
    points_agg = (
        await db.execute(
            select(
                func.coalesce(func.sum(Task.points_earned), 0).label("earned"),
                func.coalesce(func.sum(TaskTemplate.points), 0).label("max_pts"),
            )
            .join(TaskTemplate, TaskTemplate.id == Task.template_id)
            .where(Task.assignment_id.in_(assignments))
        )
    ).mappings().first()

    return {
        "assignments_total": len(assignments),
        "today": today_by_status,
        "pending_attendance": att_pending,
        "pending_reviews": {
            "tasks": pending_tasks,
            "journals": pending_journals,
            "analyses": pending_analyses,
            "total": pending_tasks + pending_journals + pending_analyses,
        },
        "points_earned": int(points_agg["earned"]) if points_agg else 0,
        "points_max": int(points_agg["max_pts"]) if points_agg else 0,
    }


def _empty_supervisor_overview() -> dict[str, Any]:
    return {
        "assignments_total": 0,
        "today": {s.value: 0 for s in AttendanceDayStatus},
        "pending_attendance": 0,
        "pending_reviews": {"tasks": 0, "journals": 0, "analyses": 0, "total": 0},
        "points_earned": 0,
        "points_max": 0,
    }


async def student_overview(db: AsyncSession, user: User) -> dict[str, Any] | None:
    """Talaba: o'zining aktiv amaliyoti progress'i."""
    student = (
        await db.execute(select(Student).where(Student.user_id == user.id))
    ).scalar_one_or_none()
    if not student:
        return None

    # Aktiv/draft assignment
    assignment = (
        await db.execute(
            select(PracticeAssignment)
            .where(
                PracticeAssignment.student_id == student.id,
                PracticeAssignment.status.in_(
                    [AssignmentStatus.DRAFT, AssignmentStatus.ACTIVE]
                ),
            )
            .order_by(PracticeAssignment.start_date.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if not assignment:
        return {"has_assignment": False}

    # Attendance percent
    att_rows = (
        await db.execute(
            select(AttendanceDay.status, func.count(AttendanceDay.id))
            .where(AttendanceDay.assignment_id == assignment.id)
            .group_by(AttendanceDay.status)
        )
    ).all()
    att = {s.value: 0 for s in AttendanceDayStatus}
    for s, c in att_rows:
        att[s.value] = c
    att_total = sum(att.values())
    att_percent = (
        int(round(att["green"] / att_total * 100)) if att_total else None
    )

    # Tasks progress
    points_earned = (
        await db.execute(
            select(func.coalesce(func.sum(Task.points_earned), 0)).where(
                Task.assignment_id == assignment.id
            )
        )
    ).scalar_one()
    max_pts = (
        await db.execute(
            select(func.coalesce(func.sum(TaskTemplate.points), 0))
            .join(Task, Task.template_id == TaskTemplate.id)
            .where(Task.assignment_id == assignment.id)
        )
    ).scalar_one()

    # Rejected count — talaba uchun qayta yuborish kerak bo'lgan ishlar
    rejected_tasks = (
        await db.execute(
            select(func.count(Task.id)).where(
                Task.assignment_id == assignment.id,
                Task.status == TaskStatus.REJECTED,
            )
        )
    ).scalar_one()
    rejected_journals = (
        await db.execute(
            select(func.count(JournalEntry.id)).where(
                JournalEntry.assignment_id == assignment.id,
                JournalEntry.status == JournalStatus.REJECTED,
            )
        )
    ).scalar_one()

    days_left = (assignment.end_date - datetime.now(UTC).date()).days

    return {
        "has_assignment": True,
        "assignment_id": str(assignment.id),
        "days_left": days_left,
        "attendance": {
            "total": att_total,
            "green": att["green"],
            "red": att["red"],
            "pending": att["pending"],
            "percent": att_percent,
        },
        "tasks": {
            "earned_points": int(points_earned),
            "max_points": int(max_pts),
            "rejected": rejected_tasks,
        },
        "journals_rejected": rejected_journals,
    }
