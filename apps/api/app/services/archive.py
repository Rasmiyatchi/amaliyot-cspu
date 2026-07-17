"""Archive service — talabaning yig'ma jildi (cover + journal + analyses + tasks).

Har PDF alohida olinishi mumkin, yoki ZIP'da barchasi birga.
"""

from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from typing import Any
from uuid import UUID
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import HTTPException, status
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from weasyprint import HTML

from app.models.academic import Direction, Group
from app.models.attendance import AttendanceDay
from app.models.contract import Contract
from app.models.enums import AttendanceDayStatus, JournalStatus, TaskStatus
from app.models.organization import Organization
from app.models.practice_assignment import PracticeAssignment
from app.models.practice_type import PracticeType
from app.models.student import Student
from app.models.supervisor import Supervisor
from app.models.task import JournalEntry, LessonAnalysis, Task, TaskTemplate
from app.models.user import User
from app.services.attendance_stats import compute_percent

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


# ─── Status localization ─────────────────────────────────

_STATUS_LABEL = {
    "approved": "Tasdiqlangan",
    "submitted": "Yuborilgan",
    "rejected": "Rad etilgan",
    "not_started": "Boshlanmagan",
    "draft": "Qoralama",
}

_CATEGORY_LABEL = {
    "spiritual": "Ma'naviy ishlari",
    "academic": "O'quv ishlari",
    "report": "Hisobot",
}

_SEMESTER_LABEL = {"fall": "Kuzgi", "spring": "Bahorgi"}


def _fmt_date(d: Any) -> str:
    if d is None:
        return "—"
    if isinstance(d, datetime):
        return d.strftime("%Y-%m-%d %H:%M")
    return str(d)


# ─── Context loader ─────────────────────────────────────


async def _load_assignment_context(
    db: AsyncSession, assignment_id: UUID
) -> dict[str, Any]:
    """Assignment + student + org/area + supervisor ma'lumotlarini yuklaydi."""
    assignment = await db.get(PracticeAssignment, assignment_id)
    if not assignment:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"Biriktirish topilmadi: {assignment_id}"
        )

    student_row = (
        await db.execute(
            select(
                Student.id,
                Student.hemis_id,
                (
                    User.last_name + " " + User.first_name
                    + func.coalesce(" " + User.middle_name, "")
                ).label("full_name"),
                Group.name.label("group_name"),
                Group.course,
                Direction.code.label("direction_code"),
                Direction.name.label("direction_name"),
            )
            .join(User, User.id == Student.user_id)
            .outerjoin(Group, Group.id == Student.group_id)
            .outerjoin(Direction, Direction.id == Group.direction_id)
            .where(Student.id == assignment.student_id)
        )
    ).mappings().first()

    student = dict(student_row) if student_row else {}
    if student.get("full_name"):
        student["full_name"] = " ".join(student["full_name"].split())

    pt = (
        await db.execute(
            select(PracticeType.name).where(
                PracticeType.id == assignment.practice_type_id
            )
        )
    ).scalar_one_or_none()

    org_name = None
    if assignment.organization_id:
        org_name = (
            await db.execute(
                select(Organization.name).where(Organization.id == assignment.organization_id)
            )
        ).scalar_one_or_none()

    area_name = None
    if assignment.area_id:
        from app.models.area import Area

        area_name = (
            await db.execute(
                select(Area.name).where(Area.id == assignment.area_id)
            )
        ).scalar_one_or_none()

    supervisor_name = None
    if assignment.supervisor_id:
        supervisor_row = (
            await db.execute(
                select(User.last_name, User.first_name)
                .join(Supervisor, Supervisor.user_id == User.id)
                .where(Supervisor.id == assignment.supervisor_id)
            )
        ).first()
        if supervisor_row:
            supervisor_name = f"{supervisor_row[0]} {supervisor_row[1]}".strip()

    assignment_ctx = {
        "id": str(assignment.id),
        "practice_type_name": pt or "—",
        "organization_name": org_name,
        "area_name": area_name,
        "supervisor_full_name": supervisor_name,
        "start_date": str(assignment.start_date),
        "end_date": str(assignment.end_date),
    }

    return {"assignment": assignment_ctx, "student": student, "_raw": assignment}


# ─── Stats ──────────────────────────────────────────────


async def _load_stats(db: AsyncSession, assignment_id: UUID) -> dict[str, Any]:
    # Attendance
    att_rows = (
        await db.execute(
            select(AttendanceDay.status, func.count(AttendanceDay.id))
            .where(AttendanceDay.assignment_id == assignment_id)
            .group_by(AttendanceDay.status)
        )
    ).all()
    att: dict[str, int] = {s.value: 0 for s in AttendanceDayStatus}
    for s, c in att_rows:
        att[s.value] = c
    att_total = sum(att.values())
    green = att["green"]
    red = att["red"]
    asn = await db.get(PracticeAssignment, assignment_id)
    att_percent = (
        compute_percent(
            green=green,
            record_total=att_total,
            start=asn.start_date,
            end=asn.end_date,
            weekdays=asn.required_weekdays,
        )
        if asn
        else None
    )

    # Tasks
    task_rows = (
        await db.execute(
            select(Task.status, func.count(Task.id), func.sum(Task.points_earned))
            .where(Task.assignment_id == assignment_id)
            .group_by(Task.status)
        )
    ).all()
    task_counts: dict[str, int] = {s.value: 0 for s in TaskStatus}
    earned = 0
    for s, c, pts in task_rows:
        task_counts[s.value] = c
        if pts:
            earned += int(pts)
    max_pts = (
        await db.execute(
            select(func.coalesce(func.sum(TaskTemplate.points), 0))
            .join(Task, Task.template_id == TaskTemplate.id)
            .where(Task.assignment_id == assignment_id)
        )
    ).scalar_one()

    # Journal + Analyses
    j_rows = (
        await db.execute(
            select(JournalEntry.status, func.count(JournalEntry.id))
            .where(JournalEntry.assignment_id == assignment_id)
            .group_by(JournalEntry.status)
        )
    ).all()
    j_counts: dict[str, int] = {s.value: 0 for s in JournalStatus}
    for s, c in j_rows:
        j_counts[s.value] = c

    a_rows = (
        await db.execute(
            select(LessonAnalysis.status, func.count(LessonAnalysis.id))
            .where(LessonAnalysis.assignment_id == assignment_id)
            .group_by(LessonAnalysis.status)
        )
    ).all()
    a_counts: dict[str, int] = {s.value: 0 for s in JournalStatus}
    for s, c in a_rows:
        a_counts[s.value] = c

    # Contract — assignmentga mos shartnomani topamiz (students JSONB'da assignment_id bor)
    assignment = await db.get(PracticeAssignment, assignment_id)
    contract_number = None
    contract_status = None
    contract_pdf = None
    contract_scan = None
    if assignment and assignment.organization_id:
        rows = (
            await db.execute(
                select(
                    Contract.number,
                    Contract.status,
                    Contract.pdf_path,
                    Contract.scan_path,
                    Contract.students,
                )
                .where(Contract.organization_id == assignment.organization_id)
                .order_by(Contract.created_at.desc())
            )
        ).all()
        for number, c_status, pdf, scan, students_json in rows:
            for s in students_json or []:
                if s.get("assignment_id") == str(assignment_id):
                    contract_number = number
                    contract_status = (
                        c_status.value if hasattr(c_status, "value") else str(c_status)
                    )
                    contract_pdf = pdf
                    contract_scan = scan
                    break
            if contract_number:
                break

    return {
        "total_days": (assignment.end_date - assignment.start_date).days + 1
        if assignment
        else 0,
        "attendance_total": att_total,
        "attendance_green": green,
        "attendance_red": red,
        "attendance_pending": att.get("pending", 0),
        "attendance_percent": att_percent,
        "tasks_total": sum(task_counts.values()),
        "tasks_approved": task_counts["approved"],
        "tasks_submitted": task_counts["submitted"],
        "tasks_rejected": task_counts["rejected"],
        "tasks_earned_points": earned,
        "tasks_max_points": int(max_pts),
        "journal_total": sum(j_counts.values()),
        "journal_approved": j_counts["approved"],
        "analysis_total": sum(a_counts.values()),
        "analysis_approved": a_counts["approved"],
        "contract_number": contract_number,
        "contract_status": contract_status,
        "contract_pdf_path": contract_pdf,
        "contract_scan_path": contract_scan,
    }


# ─── Renderers ──────────────────────────────────────────


def _render_pdf(template_name: str, context: dict[str, Any]) -> bytes:
    html_content = _env.get_template(template_name).render(**context)
    result = HTML(string=html_content).write_pdf()
    if result is None:
        raise RuntimeError(f"WeasyPrint returned None for {template_name}")
    return bytes(result)


async def render_cover_pdf(db: AsyncSession, assignment_id: UUID) -> bytes:
    ctx = await _load_assignment_context(db, assignment_id)
    stats = await _load_stats(db, assignment_id)
    return _render_pdf(
        "archive/cover.html",
        {
            "title": "Yig'ma jild",
            "header_title": "YIG'MA JILD",
            "header_subtitle": "Amaliyot hisoboti",
            "student": ctx["student"],
            "assignment": ctx["assignment"],
            "stats": stats,
            "generated_at": datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC"),
        },
    )


async def render_journal_pdf(db: AsyncSession, assignment_id: UUID) -> bytes:
    ctx = await _load_assignment_context(db, assignment_id)
    rows = (
        (
            await db.execute(
                select(JournalEntry)
                .where(JournalEntry.assignment_id == assignment_id)
                .order_by(JournalEntry.date.asc())
            )
        )
        .scalars()
        .all()
    )
    approver_ids = {r.approved_by_id for r in rows if r.approved_by_id}
    approver_map: dict[UUID, str] = {}
    if approver_ids:
        approver_map = {
            u_id: f"{last} {first}".strip()
            for u_id, last, first in (
                await db.execute(
                    select(User.id, User.last_name, User.first_name).where(
                        User.id.in_(approver_ids)
                    )
                )
            ).all()
        }

    entries = [
        {
            "date": e.date.strftime("%Y-%m-%d"),
            "content_md": e.content_md,
            "status": e.status.value,
            "status_label": _STATUS_LABEL.get(e.status.value, e.status.value),
            "approved_by_name": approver_map.get(e.approved_by_id)
            if e.approved_by_id
            else None,
            "approved_at": _fmt_date(e.approved_at),
            "rejection_reason": e.rejection_reason,
        }
        for e in rows
    ]

    return _render_pdf(
        "archive/journal.html",
        {
            "title": "Kundalik",
            "header_title": "KUNDALIK DAFTAR",
            "student": ctx["student"],
            "entries": entries,
        },
    )


async def render_analyses_pdf(db: AsyncSession, assignment_id: UUID) -> bytes:
    ctx = await _load_assignment_context(db, assignment_id)
    rows = (
        (
            await db.execute(
                select(LessonAnalysis)
                .where(LessonAnalysis.assignment_id == assignment_id)
                .order_by(LessonAnalysis.date.asc())
            )
        )
        .scalars()
        .all()
    )
    approver_ids = {r.approved_by_id for r in rows if r.approved_by_id}
    approver_map: dict[UUID, str] = {}
    if approver_ids:
        approver_map = {
            u_id: f"{last} {first}".strip()
            for u_id, last, first in (
                await db.execute(
                    select(User.id, User.last_name, User.first_name).where(
                        User.id.in_(approver_ids)
                    )
                )
            ).all()
        }

    analyses = [
        {
            "date": a.date.strftime("%Y-%m-%d"),
            "subject": a.subject,
            "teacher_name": a.teacher_name,
            "grade_level": a.grade_level,
            "quarter": a.quarter,
            "analysis_md": a.analysis_md,
            "status": a.status.value,
            "status_label": _STATUS_LABEL.get(a.status.value, a.status.value),
            "approved_by_name": approver_map.get(a.approved_by_id)
            if a.approved_by_id
            else None,
            "approved_at": _fmt_date(a.approved_at),
            "rejection_reason": a.rejection_reason,
        }
        for a in rows
    ]

    return _render_pdf(
        "archive/analyses.html",
        {
            "title": "Dars tahlillari",
            "header_title": "DARS TAHLILI DAFTARI",
            "student": ctx["student"],
            "analyses": analyses,
        },
    )


async def render_tasks_pdf(db: AsyncSession, assignment_id: UUID) -> bytes:
    ctx = await _load_assignment_context(db, assignment_id)

    rows = (
        await db.execute(
            select(
                Task.id,
                Task.status,
                Task.submission_md,
                Task.points_earned,
                Task.graded_by_id,
                Task.graded_at,
                Task.rejection_reason,
                TaskTemplate.title.label("template_title"),
                TaskTemplate.points.label("template_points"),
                TaskTemplate.month_hint.label("template_month_hint"),
                TaskTemplate.semester,
                TaskTemplate.category,
                TaskTemplate.display_order,
            )
            .join(TaskTemplate, TaskTemplate.id == Task.template_id)
            .where(Task.assignment_id == assignment_id)
            .order_by(
                TaskTemplate.semester,
                TaskTemplate.category,
                TaskTemplate.display_order,
            )
        )
    ).mappings().all()

    grader_ids = {r["graded_by_id"] for r in rows if r.get("graded_by_id")}
    grader_map: dict[UUID, str] = {}
    if grader_ids:
        grader_map = {
            u_id: f"{last} {first}".strip()
            for u_id, last, first in (
                await db.execute(
                    select(User.id, User.last_name, User.first_name).where(
                        User.id.in_(grader_ids)
                    )
                )
            ).all()
        }

    # Grouping
    sections: list[dict[str, Any]] = []
    current_key: tuple[Any, Any] | None = None
    current: dict[str, Any] | None = None
    for r in rows:
        key = (r["semester"], r["category"])
        if key != current_key:
            sem_label = _SEMESTER_LABEL.get(
                r["semester"].value if hasattr(r["semester"], "value") else str(r["semester"]),
                str(r["semester"]),
            )
            cat_label = _CATEGORY_LABEL.get(
                r["category"].value if hasattr(r["category"], "value") else str(r["category"]),
                str(r["category"]),
            )
            current = {"title": f"{sem_label} · {cat_label}", "tasks": []}
            sections.append(current)
            current_key = key

        status_val = (
            r["status"].value if hasattr(r["status"], "value") else str(r["status"])
        )
        assert current is not None
        current["tasks"].append(
            {
                "template_title": r["template_title"],
                "template_points": r["template_points"],
                "template_month_hint": r["template_month_hint"],
                "status": status_val,
                "status_label": _STATUS_LABEL.get(status_val, status_val),
                "submission_md": r["submission_md"],
                "points_earned": r["points_earned"],
                "graded_by_name": grader_map.get(r["graded_by_id"])
                if r["graded_by_id"]
                else None,
                "graded_at": _fmt_date(r["graded_at"]),
                "rejection_reason": r["rejection_reason"],
            }
        )

    return _render_pdf(
        "archive/tasks.html",
        {
            "title": "Topshiriqlar",
            "header_title": "O'QUV TOPSHIRIQLARI",
            "student": ctx["student"],
            "sections": sections,
        },
    )


# ─── ZIP builder ────────────────────────────────────────


async def build_archive_zip(db: AsyncSession, assignment_id: UUID) -> tuple[bytes, str]:
    """Barcha PDF'lar + shartnoma skani'ni (agar bor bo'lsa) ZIP'ga yig'adi.

    Qaytaradi: (zip_bytes, filename).
    """
    ctx = await _load_assignment_context(db, assignment_id)
    stats = await _load_stats(db, assignment_id)

    cover = await render_cover_pdf(db, assignment_id)
    journal = await render_journal_pdf(db, assignment_id)
    analyses = await render_analyses_pdf(db, assignment_id)
    tasks = await render_tasks_pdf(db, assignment_id)

    buf = BytesIO()
    with ZipFile(buf, "w", ZIP_DEFLATED) as z:
        z.writestr("00-hisobot.pdf", cover)
        z.writestr("01-kundalik.pdf", journal)
        z.writestr("02-dars-tahlillari.pdf", analyses)
        z.writestr("03-topshiriqlar.pdf", tasks)

        # Shartnoma — agar fayl bor bo'lsa (sync IO — kichik fayllar)
        if stats.get("contract_pdf_path"):
            p = Path(stats["contract_pdf_path"])
            if p.exists():  # noqa: ASYNC240
                z.writestr(f"04-shartnoma-{p.name}", p.read_bytes())  # noqa: ASYNC240
        if stats.get("contract_scan_path"):
            p = Path(stats["contract_scan_path"])
            if p.exists():  # noqa: ASYNC240
                z.writestr(f"05-shartnoma-skan{p.suffix}", p.read_bytes())  # noqa: ASYNC240

    buf.seek(0)
    student = ctx["student"]
    hemis = student.get("hemis_id", "talaba")
    safe_name = hemis.replace("/", "_").replace("\\", "_")
    filename = f"yigma-jild-{safe_name}.zip"
    return buf.read(), filename
