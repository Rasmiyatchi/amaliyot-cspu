"""Task service — TaskTemplate, Task, JournalEntry, LessonAnalysis CRUD + workflow.

Biznes mantiq:
- Assignment yaratilganda: shu practice_type + course uchun templatelarga mos Task instance'lar
  `ensure_tasks_for_assignment` orqali yaratiladi (not_started status).
- Talaba submit qilganda: status → SUBMITTED, submitted_at belgilanadi.
- Supervisor approve/reject — ball beriladi yoki sabab yoziladi.
- JournalEntry va LessonAnalysis — talaba yaratadi (DRAFT), submit qiladi, supervisor tasdiqlaydi.
"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import Group
from app.models.enums import JournalStatus, Semester, TaskStatus, UserRole
from app.models.practice_assignment import PracticeAssignment
from app.models.student import Student
from app.models.supervisor import Supervisor
from app.models.task import JournalEntry, LessonAnalysis, Task, TaskTemplate
from app.models.user import User

# ─── Access helpers ─────────────────────────────────────


async def _get_assignment(db: AsyncSession, assignment_id: UUID) -> PracticeAssignment:
    assignment = await db.get(PracticeAssignment, assignment_id)
    if not assignment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Biriktirish topilmadi: {assignment_id}")
    return assignment


async def _check_student_owns(
    db: AsyncSession, assignment_id: UUID, user_id: UUID
) -> PracticeAssignment:
    stmt = (
        select(PracticeAssignment)
        .join(Student, Student.id == PracticeAssignment.student_id)
        .where(
            PracticeAssignment.id == assignment_id,
            Student.user_id == user_id,
        )
    )
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    if not assignment:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Biriktirish sizga tegishli emas"
        )
    return assignment


async def _check_supervisor_owns(
    db: AsyncSession, assignment_id: UUID, user_id: UUID
) -> PracticeAssignment:
    stmt = (
        select(PracticeAssignment)
        .join(Supervisor, Supervisor.id == PracticeAssignment.supervisor_id)
        .where(
            PracticeAssignment.id == assignment_id,
            Supervisor.user_id == user_id,
        )
    )
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    if not assignment:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Siz bu biriktirishga supervizor emassiz"
        )
    return assignment


async def _assignment_course(db: AsyncSession, assignment: PracticeAssignment) -> int | None:
    """Assignmentning talabasi qaysi kursda — Group.course dan."""
    if not assignment.student_id:
        return None
    stmt = (
        select(Group.course)
        .join(Student, Student.group_id == Group.id)
        .where(Student.id == assignment.student_id)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


def _semester_for_date(d: datetime) -> Semester:
    """Oy asosida semestr aniqlash: 9-12 = FALL, 1-6 = SPRING."""
    return Semester.FALL if d.month >= 8 else Semester.SPRING


# ─── TaskTemplate ────────────────────────────────────────


async def list_templates(
    db: AsyncSession,
    *,
    practice_type_id: UUID | None = None,
    course: int | None = None,
    semester: Semester | None = None,
) -> list[dict[str, Any]]:
    stmt = select(TaskTemplate).where(TaskTemplate.is_active.is_(True))
    if practice_type_id:
        stmt = stmt.where(TaskTemplate.practice_type_id == practice_type_id)
    if course:
        stmt = stmt.where(TaskTemplate.course == course)
    if semester:
        stmt = stmt.where(TaskTemplate.semester == semester)

    rows = (
        (
            await db.execute(
                stmt.order_by(
                    TaskTemplate.course,
                    TaskTemplate.semester,
                    TaskTemplate.category,
                    TaskTemplate.display_order,
                )
            )
        )
        .scalars()
        .all()
    )
    return [_template_to_dict(t) for t in rows]


def _template_to_dict(t: TaskTemplate) -> dict[str, Any]:
    return {
        "id": t.id,
        "practice_type_id": t.practice_type_id,
        "course": t.course,
        "semester": t.semester,
        "category": t.category,
        "type": t.type,
        "title": t.title,
        "description": t.description,
        "points": t.points,
        "quantity": t.quantity,
        "month_hint": t.month_hint,
        "display_order": t.display_order,
        "is_active": t.is_active,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
    }


# ─── Task instance ──────────────────────────────────────


async def ensure_tasks_for_assignment(
    db: AsyncSession, assignment_id: UUID
) -> int:
    """Assignment uchun mos templatelarga Task instance'lar yaratadi.

    Agar allaqachon yaratilgan bo'lsa — skip.
    Qaytaradi: yaratilgan yangi task soni.
    """
    assignment = await _get_assignment(db, assignment_id)
    course = await _assignment_course(db, assignment)
    if course is None:
        return 0

    # Mos templatelar (practice_type + course)
    tmpl_rows = (
        (
            await db.execute(
                select(TaskTemplate).where(
                    TaskTemplate.practice_type_id == assignment.practice_type_id,
                    TaskTemplate.course == course,
                    TaskTemplate.is_active.is_(True),
                )
            )
        )
        .scalars()
        .all()
    )
    if not tmpl_rows:
        return 0

    existing_template_ids = {
        r[0]
        for r in (
            await db.execute(
                select(Task.template_id).where(Task.assignment_id == assignment_id)
            )
        ).all()
    }

    created = 0
    for t in tmpl_rows:
        if t.id in existing_template_ids:
            continue
        task = Task(
            assignment_id=assignment_id,
            template_id=t.id,
            status=TaskStatus.NOT_STARTED,
        )
        db.add(task)
        created += 1

    if created:
        await db.commit()
    return created


async def add_tasks_by_template_ids(
    db: AsyncSession, assignment_id: UUID, template_ids: list[UUID]
) -> list[UUID]:
    """Ko'rsatilgan template_id'lar bo'yicha tanlab task instance'lar yaratadi.

    Validatsiya: template'lar assignment.practice_type_id va student.course ga mos bo'lishi
    kerak. Allaqachon mavjud template'lar skip qilinadi.

    Qaytaradi: yaratilgan task'larning id'lari.
    """
    if not template_ids:
        return []
    assignment = await _get_assignment(db, assignment_id)
    course = await _assignment_course(db, assignment)
    if course is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Talaba kursi aniqlanmagan (guruhi yo'q)"
        )

    tmpl_rows = (
        (
            await db.execute(
                select(TaskTemplate).where(
                    TaskTemplate.id.in_(template_ids),
                    TaskTemplate.practice_type_id == assignment.practice_type_id,
                    TaskTemplate.course == course,
                    TaskTemplate.is_active.is_(True),
                )
            )
        )
        .scalars()
        .all()
    )
    valid_ids = {t.id for t in tmpl_rows}
    invalid = set(template_ids) - valid_ids
    if invalid:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Mos kelmaydigan template: {invalid}",
        )

    existing_template_ids = {
        r[0]
        for r in (
            await db.execute(
                select(Task.template_id).where(Task.assignment_id == assignment_id)
            )
        ).all()
    }

    created_ids: list[UUID] = []
    for t in tmpl_rows:
        if t.id in existing_template_ids:
            continue
        task = Task(
            assignment_id=assignment_id,
            template_id=t.id,
            status=TaskStatus.NOT_STARTED,
        )
        db.add(task)
        await db.flush()
        created_ids.append(task.id)

    if created_ids:
        await db.commit()
    return created_ids


async def delete_task(db: AsyncSession, task_id: UUID) -> None:
    """Taskni o'chirish — agar submit qilinmagan yoki rejected bo'lsa."""
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topshiriq topilmadi")
    if task.status == TaskStatus.APPROVED:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Tasdiqlangan topshiriqni o'chirib bo'lmaydi",
        )
    await db.delete(task)
    await db.commit()


async def list_available_templates_for_assignment(
    db: AsyncSession, assignment_id: UUID
) -> list[dict[str, Any]]:
    """Assignment uchun ishlatilmagan (hali task instance sifatida qo'shilmagan) templatelar."""
    assignment = await _get_assignment(db, assignment_id)
    course = await _assignment_course(db, assignment)
    if course is None:
        return []

    existing_template_ids = {
        r[0]
        for r in (
            await db.execute(
                select(Task.template_id).where(Task.assignment_id == assignment_id)
            )
        ).all()
    }

    rows = (
        (
            await db.execute(
                select(TaskTemplate)
                .where(
                    TaskTemplate.practice_type_id == assignment.practice_type_id,
                    TaskTemplate.course == course,
                    TaskTemplate.is_active.is_(True),
                )
                .order_by(
                    TaskTemplate.semester,
                    TaskTemplate.category,
                    TaskTemplate.display_order,
                )
            )
        )
        .scalars()
        .all()
    )
    return [
        _template_to_dict(t)
        for t in rows
        if t.id not in existing_template_ids
    ]


def _task_row_to_dict(row: dict[str, Any]) -> dict[str, Any]:
    return dict(row)


def _base_task_select() -> Any:
    return (
        select(
            Task.id,
            Task.assignment_id,
            Task.template_id,
            TaskTemplate.title.label("template_title"),
            TaskTemplate.type.label("template_type"),
            TaskTemplate.category.label("template_category"),
            TaskTemplate.course.label("template_course"),
            TaskTemplate.semester.label("template_semester"),
            TaskTemplate.points.label("template_points"),
            TaskTemplate.quantity.label("template_quantity"),
            TaskTemplate.month_hint.label("template_month_hint"),
            TaskTemplate.description.label("template_description"),
            Task.status,
            Task.submission_md,
            Task.attachments,
            Task.submitted_at,
            Task.points_earned,
            Task.graded_by_id,
            Task.graded_at,
            Task.rejection_reason,
            Task.created_at,
            Task.updated_at,
        )
        .join(TaskTemplate, TaskTemplate.id == Task.template_id)
    )


async def list_tasks_for_assignment(
    db: AsyncSession, assignment_id: UUID
) -> list[dict[str, Any]]:
    stmt = (
        _base_task_select()
        .where(Task.assignment_id == assignment_id)
        .order_by(
            TaskTemplate.semester,
            TaskTemplate.category,
            TaskTemplate.display_order,
        )
    )
    rows = (await db.execute(stmt)).mappings().all()
    items = [_task_row_to_dict(dict(r)) for r in rows]
    await _hydrate_grader_name(db, items)
    return items


async def get_task(db: AsyncSession, task_id: UUID) -> dict[str, Any]:
    row = (
        (await db.execute(_base_task_select().where(Task.id == task_id)))
        .mappings()
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topshiriq topilmadi")
    items = [_task_row_to_dict(dict(row))]
    await _hydrate_grader_name(db, items)
    return items[0]


async def _hydrate_grader_name(
    db: AsyncSession, rows: list[dict[str, Any]]
) -> None:
    ids = {r["graded_by_id"] for r in rows if r.get("graded_by_id")}
    if not ids:
        for r in rows:
            r["graded_by_name"] = None
        return
    name_map = {
        u[0]: f"{u[1]} {u[2]}".strip()
        for u in (
            await db.execute(
                select(User.id, User.last_name, User.first_name).where(User.id.in_(ids))
            )
        ).all()
    }
    for r in rows:
        r["graded_by_name"] = name_map.get(r.get("graded_by_id")) if r.get("graded_by_id") else None


async def student_submit_task(
    db: AsyncSession, task_id: UUID, user: User, payload: BaseModel
) -> dict[str, Any]:
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topshiriq topilmadi")
    await _check_student_owns(db, task.assignment_id, user.id)
    if task.status == TaskStatus.APPROVED:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Topshiriq tasdiqlangan — o'zgartirish mumkin emas"
        )

    data = payload.model_dump()
    task.submission_md = data["submission_md"]
    task.attachments = data.get("attachments") or []
    task.status = TaskStatus.SUBMITTED
    task.submitted_at = datetime.now(UTC)
    # Agar oldin reject qilingan bo'lsa, sababni tozalaymiz (revision loop)
    task.rejection_reason = None

    await db.commit()
    return await get_task(db, task.id)


async def supervisor_approve_task(
    db: AsyncSession, task_id: UUID, user: User, payload: BaseModel
) -> dict[str, Any]:
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topshiriq topilmadi")

    if user.role == UserRole.SUPERVISOR:
        await _check_supervisor_owns(db, task.assignment_id, user.id)

    data = payload.model_dump()
    task.status = TaskStatus.APPROVED
    task.graded_by_id = user.id
    task.graded_at = datetime.now(UTC)
    if data.get("points_earned") is not None:
        task.points_earned = data["points_earned"]

    await db.commit()
    return await get_task(db, task.id)


async def supervisor_reject_task(
    db: AsyncSession, task_id: UUID, user: User, payload: BaseModel
) -> dict[str, Any]:
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topshiriq topilmadi")

    if user.role == UserRole.SUPERVISOR:
        await _check_supervisor_owns(db, task.assignment_id, user.id)

    data = payload.model_dump()
    task.status = TaskStatus.REJECTED
    task.rejection_reason = data["rejection_reason"]
    task.graded_by_id = user.id
    task.graded_at = datetime.now(UTC)

    await db.commit()
    return await get_task(db, task.id)


# ─── Journal ────────────────────────────────────────────


def _journal_to_dict(j: JournalEntry) -> dict[str, Any]:
    return {
        "id": j.id,
        "assignment_id": j.assignment_id,
        "date": j.date,
        "content_md": j.content_md,
        "attachments": j.attachments,
        "status": j.status,
        "approved_by_id": j.approved_by_id,
        "approved_at": j.approved_at,
        "rejection_reason": j.rejection_reason,
        "created_at": j.created_at,
        "updated_at": j.updated_at,
    }


async def _hydrate_approver_name(
    db: AsyncSession, items: list[dict[str, Any]]
) -> None:
    ids = {r["approved_by_id"] for r in items if r.get("approved_by_id")}
    if not ids:
        for r in items:
            r["approved_by_name"] = None
        return
    name_map = {
        u[0]: f"{u[1]} {u[2]}".strip()
        for u in (
            await db.execute(
                select(User.id, User.last_name, User.first_name).where(User.id.in_(ids))
            )
        ).all()
    }
    for r in items:
        r["approved_by_name"] = (
            name_map.get(r.get("approved_by_id")) if r.get("approved_by_id") else None
        )


async def list_journal_entries(
    db: AsyncSession, assignment_id: UUID
) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            select(JournalEntry)
            .where(JournalEntry.assignment_id == assignment_id)
            .order_by(JournalEntry.date.desc())
        )
    ).scalars().all()
    items = [_journal_to_dict(j) for j in rows]
    await _hydrate_approver_name(db, items)
    return items


async def student_create_journal(
    db: AsyncSession, assignment_id: UUID, user: User, payload: BaseModel
) -> dict[str, Any]:
    assignment = await _check_student_owns(db, assignment_id, user.id)
    data = payload.model_dump()
    the_date = data["date"]
    if the_date.date() < assignment.start_date or the_date.date() > assignment.end_date:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Sana amaliyot diapazonidan tashqarida "
            f"({assignment.start_date} – {assignment.end_date})",
        )
    entry = JournalEntry(
        assignment_id=assignment_id,
        date=the_date,
        content_md=data["content_md"],
        attachments=data.get("attachments") or [],
        status=JournalStatus.SUBMITTED,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    items = [_journal_to_dict(entry)]
    await _hydrate_approver_name(db, items)
    return items[0]


async def student_update_journal(
    db: AsyncSession, entry_id: UUID, user: User, payload: BaseModel
) -> dict[str, Any]:
    entry = await db.get(JournalEntry, entry_id)
    if not entry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kundalik topilmadi")
    await _check_student_owns(db, entry.assignment_id, user.id)
    if entry.status == JournalStatus.APPROVED:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Tasdiqlangan kundalikni o'zgartirib bo'lmaydi"
        )

    data = payload.model_dump(exclude_unset=True)
    if "content_md" in data and data["content_md"] is not None:
        entry.content_md = data["content_md"]
    if "attachments" in data and data["attachments"] is not None:
        entry.attachments = data["attachments"]
    # Revision loop — SUBMITTED ga qaytadi
    if entry.status == JournalStatus.REJECTED:
        entry.status = JournalStatus.SUBMITTED
        entry.rejection_reason = None

    await db.commit()
    items = [_journal_to_dict(entry)]
    await _hydrate_approver_name(db, items)
    return items[0]


async def supervisor_approve_journal(
    db: AsyncSession, entry_id: UUID, user: User
) -> dict[str, Any]:
    entry = await db.get(JournalEntry, entry_id)
    if not entry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kundalik topilmadi")
    if user.role == UserRole.SUPERVISOR:
        await _check_supervisor_owns(db, entry.assignment_id, user.id)
    entry.status = JournalStatus.APPROVED
    entry.approved_by_id = user.id
    entry.approved_at = datetime.now(UTC)
    await db.commit()
    items = [_journal_to_dict(entry)]
    await _hydrate_approver_name(db, items)
    return items[0]


async def supervisor_reject_journal(
    db: AsyncSession, entry_id: UUID, user: User, payload: BaseModel
) -> dict[str, Any]:
    entry = await db.get(JournalEntry, entry_id)
    if not entry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kundalik topilmadi")
    if user.role == UserRole.SUPERVISOR:
        await _check_supervisor_owns(db, entry.assignment_id, user.id)
    data = payload.model_dump()
    entry.status = JournalStatus.REJECTED
    entry.rejection_reason = data["rejection_reason"]
    entry.approved_by_id = user.id
    entry.approved_at = datetime.now(UTC)
    await db.commit()
    items = [_journal_to_dict(entry)]
    await _hydrate_approver_name(db, items)
    return items[0]


# ─── LessonAnalysis ─────────────────────────────────────


def _analysis_to_dict(a: LessonAnalysis) -> dict[str, Any]:
    return {
        "id": a.id,
        "assignment_id": a.assignment_id,
        "date": a.date,
        "subject": a.subject,
        "teacher_name": a.teacher_name,
        "grade_level": a.grade_level,
        "quarter": a.quarter,
        "analysis_md": a.analysis_md,
        "attachments": a.attachments,
        "status": a.status,
        "approved_by_id": a.approved_by_id,
        "approved_at": a.approved_at,
        "rejection_reason": a.rejection_reason,
        "created_at": a.created_at,
        "updated_at": a.updated_at,
    }


async def list_lesson_analyses(
    db: AsyncSession,
    assignment_id: UUID,
    *,
    quarter: int | None = None,
) -> list[dict[str, Any]]:
    stmt = select(LessonAnalysis).where(LessonAnalysis.assignment_id == assignment_id)
    if quarter:
        stmt = stmt.where(LessonAnalysis.quarter == quarter)
    rows = (await db.execute(stmt.order_by(LessonAnalysis.date.desc()))).scalars().all()
    items = [_analysis_to_dict(a) for a in rows]
    await _hydrate_approver_name(db, items)
    return items


async def student_create_lesson_analysis(
    db: AsyncSession, assignment_id: UUID, user: User, payload: BaseModel
) -> dict[str, Any]:
    assignment = await _check_student_owns(db, assignment_id, user.id)
    data = payload.model_dump()
    the_date = data["date"]
    if the_date.date() < assignment.start_date or the_date.date() > assignment.end_date:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Sana amaliyot diapazonidan tashqarida",
        )

    analysis = LessonAnalysis(
        assignment_id=assignment_id,
        date=the_date,
        subject=data["subject"],
        teacher_name=data["teacher_name"],
        grade_level=data.get("grade_level"),
        quarter=data["quarter"],
        analysis_md=data["analysis_md"],
        attachments=data.get("attachments") or [],
        status=JournalStatus.SUBMITTED,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)
    items = [_analysis_to_dict(analysis)]
    await _hydrate_approver_name(db, items)
    return items[0]


async def student_update_lesson_analysis(
    db: AsyncSession, analysis_id: UUID, user: User, payload: BaseModel
) -> dict[str, Any]:
    analysis = await db.get(LessonAnalysis, analysis_id)
    if not analysis:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dars tahlili topilmadi")
    await _check_student_owns(db, analysis.assignment_id, user.id)
    if analysis.status == JournalStatus.APPROVED:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Tasdiqlangan tahlilni o'zgartirib bo'lmaydi"
        )

    data = payload.model_dump(exclude_unset=True)
    for key in (
        "date",
        "subject",
        "teacher_name",
        "grade_level",
        "quarter",
        "analysis_md",
        "attachments",
    ):
        if key in data and data[key] is not None:
            setattr(analysis, key, data[key])

    if analysis.status == JournalStatus.REJECTED:
        analysis.status = JournalStatus.SUBMITTED
        analysis.rejection_reason = None

    await db.commit()
    items = [_analysis_to_dict(analysis)]
    await _hydrate_approver_name(db, items)
    return items[0]


async def supervisor_approve_lesson_analysis(
    db: AsyncSession, analysis_id: UUID, user: User
) -> dict[str, Any]:
    analysis = await db.get(LessonAnalysis, analysis_id)
    if not analysis:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dars tahlili topilmadi")
    if user.role == UserRole.SUPERVISOR:
        await _check_supervisor_owns(db, analysis.assignment_id, user.id)
    analysis.status = JournalStatus.APPROVED
    analysis.approved_by_id = user.id
    analysis.approved_at = datetime.now(UTC)
    await db.commit()
    items = [_analysis_to_dict(analysis)]
    await _hydrate_approver_name(db, items)
    return items[0]


async def supervisor_reject_lesson_analysis(
    db: AsyncSession, analysis_id: UUID, user: User, payload: BaseModel
) -> dict[str, Any]:
    analysis = await db.get(LessonAnalysis, analysis_id)
    if not analysis:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dars tahlili topilmadi")
    if user.role == UserRole.SUPERVISOR:
        await _check_supervisor_owns(db, analysis.assignment_id, user.id)
    data = payload.model_dump()
    analysis.status = JournalStatus.REJECTED
    analysis.rejection_reason = data["rejection_reason"]
    analysis.approved_by_id = user.id
    analysis.approved_at = datetime.now(UTC)
    await db.commit()
    items = [_analysis_to_dict(analysis)]
    await _hydrate_approver_name(db, items)
    return items[0]


# ─── Summary ────────────────────────────────────────────


async def assignment_progress_summary(
    db: AsyncSession, assignment_id: UUID
) -> dict[str, Any]:
    """Biriktirish bo'yicha progress — topshiriqlar holati va jurnal/tahlil sonlari."""
    task_counts = (
        await db.execute(
            select(
                Task.status,
                func.count(Task.id),
                func.sum(Task.points_earned),
            )
            .where(Task.assignment_id == assignment_id)
            .group_by(Task.status)
        )
    ).all()
    task_stats: dict[str, int] = {s.value: 0 for s in TaskStatus}
    points_earned = 0
    for row_status, count, pts in task_counts:
        task_stats[row_status.value] = count
        if pts:
            points_earned += int(pts)

    total_tasks = sum(task_stats.values())
    total_max = (
        await db.execute(
            select(func.coalesce(func.sum(TaskTemplate.points), 0))
            .join(Task, Task.template_id == TaskTemplate.id)
            .where(Task.assignment_id == assignment_id)
        )
    ).scalar_one()

    journals = (
        await db.execute(
            select(JournalEntry.status, func.count(JournalEntry.id))
            .where(JournalEntry.assignment_id == assignment_id)
            .group_by(JournalEntry.status)
        )
    ).all()
    journal_stats: dict[str, int] = {s.value: 0 for s in JournalStatus}
    for row_status, count in journals:
        journal_stats[row_status.value] = count

    analyses = (
        await db.execute(
            select(LessonAnalysis.status, func.count(LessonAnalysis.id))
            .where(LessonAnalysis.assignment_id == assignment_id)
            .group_by(LessonAnalysis.status)
        )
    ).all()
    analysis_stats: dict[str, int] = {s.value: 0 for s in JournalStatus}
    for row_status, count in analyses:
        analysis_stats[row_status.value] = count

    return {
        "assignment_id": assignment_id,
        "tasks_total": total_tasks,
        "tasks_by_status": task_stats,
        "tasks_max_points": int(total_max),
        "tasks_earned_points": points_earned,
        "journal_by_status": journal_stats,
        "analysis_by_status": analysis_stats,
    }
