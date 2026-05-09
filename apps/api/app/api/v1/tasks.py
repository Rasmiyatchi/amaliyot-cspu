"""Task, Journal, LessonAnalysis endpoints."""

from datetime import date
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser, RequireAdmin
from app.db.session import SessionDep
from app.models.enums import Semester, UserRole
from app.schemas.task import (
    JournalCreateRequest,
    JournalRead,
    JournalRejectRequest,
    JournalUpdateRequest,
    LessonAnalysisCreateRequest,
    LessonAnalysisRead,
    LessonAnalysisRejectRequest,
    LessonAnalysisUpdateRequest,
    TaskGradeRequest,
    TaskRead,
    TaskRejectRequest,
    TaskSubmitRequest,
    TaskTemplateRead,
)
from app.services import task as svc

router = APIRouter(tags=["tasks"])


class TaskAssignItem(BaseModel):
    template_id: UUID
    due_date: date = Field(..., description="Topshiriq deadline'i — majburiy")
    notes: str | None = Field(None, max_length=2000)


class AddTasksRequest(BaseModel):
    items: list[TaskAssignItem] = Field(..., min_length=1, max_length=100)


def _require_student(user_role: UserRole) -> None:
    if user_role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Faqat talaba amal qiladi")


def _require_grader(user_role: UserRole) -> None:
    if user_role not in (UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status.HTTP_403_FORBIDDEN)


# ─── TaskTemplate ────────────────────────────────────────


@router.get("/task-templates", response_model=list[TaskTemplateRead])
async def list_templates(
    db: SessionDep,
    _: CurrentUser,
    practice_type_id: UUID | None = None,
    course: int | None = Query(None, ge=1, le=4),
    semester: Semester | None = None,
) -> list[TaskTemplateRead]:
    items = await svc.list_templates(
        db, practice_type_id=practice_type_id, course=course, semester=semester
    )
    return [TaskTemplateRead.model_validate(i) for i in items]


# ─── Task — per assignment ──────────────────────────────


@router.post(
    "/assignments/{assignment_id}/tasks/ensure",
    response_model=dict,
    summary="Admin: barcha mos templatelarni qo'shish",
)
async def ensure_tasks(
    assignment_id: UUID, db: SessionDep, _: RequireAdmin
) -> dict[str, Any]:
    created = await svc.ensure_tasks_for_assignment(db, assignment_id)
    return {"assignment_id": str(assignment_id), "created": created}


@router.post(
    "/assignments/{assignment_id}/tasks",
    response_model=dict,
    summary="Admin: tanlangan templatelarni qo'shish",
)
async def add_tasks(
    assignment_id: UUID,
    payload: AddTasksRequest,
    db: SessionDep,
    _: RequireAdmin,
) -> dict[str, Any]:
    created_ids = await svc.add_tasks_by_template_ids(
        db, assignment_id, payload.items
    )
    return {
        "assignment_id": str(assignment_id),
        "created": len(created_ids),
        "task_ids": [str(i) for i in created_ids],
    }


@router.get(
    "/assignments/{assignment_id}/available-templates",
    response_model=list[TaskTemplateRead],
    summary="Assignment uchun qo'shish mumkin bo'lgan templatelar (hali qo'shilmaganlar)",
)
async def available_templates(
    assignment_id: UUID, db: SessionDep, _: RequireAdmin
) -> list[TaskTemplateRead]:
    items = await svc.list_available_templates_for_assignment(db, assignment_id)
    return [TaskTemplateRead.model_validate(i) for i in items]


@router.delete(
    "/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Admin: taskni o'chirish (tasdiqlangandan tashqari)",
)
async def delete_task(
    task_id: UUID, db: SessionDep, _: RequireAdmin
) -> None:
    await svc.delete_task(db, task_id)


@router.get(
    "/assignments/{assignment_id}/tasks",
    response_model=list[TaskRead],
    summary="Biriktirish bo'yicha topshiriqlar ro'yxati",
)
async def list_tasks(
    assignment_id: UUID, db: SessionDep, user: CurrentUser
) -> list[TaskRead]:
    if user.role == UserRole.STUDENT:
        await svc._check_student_owns(db, assignment_id, user.id)
    elif user.role == UserRole.SUPERVISOR:
        await svc._check_supervisor_owns(db, assignment_id, user.id)
    items = await svc.list_tasks_for_assignment(db, assignment_id)
    return [TaskRead.model_validate(i) for i in items]


@router.get(
    "/assignments/{assignment_id}/progress",
    response_model=dict,
    summary="Biriktirish bo'yicha progress statistikasi",
)
async def assignment_progress(
    assignment_id: UUID, db: SessionDep, user: CurrentUser
) -> dict[str, Any]:
    if user.role == UserRole.STUDENT:
        await svc._check_student_owns(db, assignment_id, user.id)
    elif user.role == UserRole.SUPERVISOR:
        await svc._check_supervisor_owns(db, assignment_id, user.id)
    return await svc.assignment_progress_summary(db, assignment_id)


@router.post("/tasks/{task_id}/submit", response_model=TaskRead)
async def student_submit(
    task_id: UUID,
    payload: TaskSubmitRequest,
    db: SessionDep,
    user: CurrentUser,
) -> TaskRead:
    _require_student(user.role)
    return TaskRead.model_validate(await svc.student_submit_task(db, task_id, user, payload))


@router.post("/tasks/{task_id}/approve", response_model=TaskRead)
async def supervisor_approve(
    task_id: UUID,
    payload: TaskGradeRequest,
    db: SessionDep,
    user: CurrentUser,
) -> TaskRead:
    _require_grader(user.role)
    return TaskRead.model_validate(
        await svc.supervisor_approve_task(db, task_id, user, payload)
    )


@router.post("/tasks/{task_id}/reject", response_model=TaskRead)
async def supervisor_reject(
    task_id: UUID,
    payload: TaskRejectRequest,
    db: SessionDep,
    user: CurrentUser,
) -> TaskRead:
    _require_grader(user.role)
    return TaskRead.model_validate(
        await svc.supervisor_reject_task(db, task_id, user, payload)
    )


# ─── JournalEntry ───────────────────────────────────────


@router.get(
    "/assignments/{assignment_id}/journal",
    response_model=list[JournalRead],
)
async def list_journal(
    assignment_id: UUID, db: SessionDep, user: CurrentUser
) -> list[JournalRead]:
    if user.role == UserRole.STUDENT:
        await svc._check_student_owns(db, assignment_id, user.id)
    elif user.role == UserRole.SUPERVISOR:
        await svc._check_supervisor_owns(db, assignment_id, user.id)
    items = await svc.list_journal_entries(db, assignment_id)
    return [JournalRead.model_validate(i) for i in items]


@router.post(
    "/assignments/{assignment_id}/journal",
    response_model=JournalRead,
    status_code=status.HTTP_201_CREATED,
    summary="Talaba: yangi kundalik yozuvi",
)
async def create_journal(
    assignment_id: UUID,
    payload: JournalCreateRequest,
    db: SessionDep,
    user: CurrentUser,
) -> JournalRead:
    _require_student(user.role)
    return JournalRead.model_validate(
        await svc.student_create_journal(db, assignment_id, user, payload)
    )


@router.patch("/journal/{entry_id}", response_model=JournalRead)
async def update_journal(
    entry_id: UUID,
    payload: JournalUpdateRequest,
    db: SessionDep,
    user: CurrentUser,
) -> JournalRead:
    _require_student(user.role)
    return JournalRead.model_validate(
        await svc.student_update_journal(db, entry_id, user, payload)
    )


@router.post("/journal/{entry_id}/approve", response_model=JournalRead)
async def approve_journal(
    entry_id: UUID, db: SessionDep, user: CurrentUser
) -> JournalRead:
    _require_grader(user.role)
    return JournalRead.model_validate(await svc.supervisor_approve_journal(db, entry_id, user))


@router.post("/journal/{entry_id}/reject", response_model=JournalRead)
async def reject_journal(
    entry_id: UUID,
    payload: JournalRejectRequest,
    db: SessionDep,
    user: CurrentUser,
) -> JournalRead:
    _require_grader(user.role)
    return JournalRead.model_validate(
        await svc.supervisor_reject_journal(db, entry_id, user, payload)
    )


# ─── LessonAnalysis ─────────────────────────────────────


@router.get(
    "/assignments/{assignment_id}/lesson-analyses",
    response_model=list[LessonAnalysisRead],
)
async def list_analyses(
    assignment_id: UUID,
    db: SessionDep,
    user: CurrentUser,
    quarter: int | None = Query(None, ge=1, le=4),
) -> list[LessonAnalysisRead]:
    if user.role == UserRole.STUDENT:
        await svc._check_student_owns(db, assignment_id, user.id)
    elif user.role == UserRole.SUPERVISOR:
        await svc._check_supervisor_owns(db, assignment_id, user.id)
    items = await svc.list_lesson_analyses(db, assignment_id, quarter=quarter)
    return [LessonAnalysisRead.model_validate(i) for i in items]


@router.post(
    "/assignments/{assignment_id}/lesson-analyses",
    response_model=LessonAnalysisRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_analysis(
    assignment_id: UUID,
    payload: LessonAnalysisCreateRequest,
    db: SessionDep,
    user: CurrentUser,
) -> LessonAnalysisRead:
    _require_student(user.role)
    return LessonAnalysisRead.model_validate(
        await svc.student_create_lesson_analysis(db, assignment_id, user, payload)
    )


@router.patch("/lesson-analyses/{analysis_id}", response_model=LessonAnalysisRead)
async def update_analysis(
    analysis_id: UUID,
    payload: LessonAnalysisUpdateRequest,
    db: SessionDep,
    user: CurrentUser,
) -> LessonAnalysisRead:
    _require_student(user.role)
    return LessonAnalysisRead.model_validate(
        await svc.student_update_lesson_analysis(db, analysis_id, user, payload)
    )


@router.post(
    "/lesson-analyses/{analysis_id}/approve", response_model=LessonAnalysisRead
)
async def approve_analysis(
    analysis_id: UUID, db: SessionDep, user: CurrentUser
) -> LessonAnalysisRead:
    _require_grader(user.role)
    return LessonAnalysisRead.model_validate(
        await svc.supervisor_approve_lesson_analysis(db, analysis_id, user)
    )


@router.post(
    "/lesson-analyses/{analysis_id}/reject", response_model=LessonAnalysisRead
)
async def reject_analysis(
    analysis_id: UUID,
    payload: LessonAnalysisRejectRequest,
    db: SessionDep,
    user: CurrentUser,
) -> LessonAnalysisRead:
    _require_grader(user.role)
    return LessonAnalysisRead.model_validate(
        await svc.supervisor_reject_lesson_analysis(db, analysis_id, user, payload)
    )
