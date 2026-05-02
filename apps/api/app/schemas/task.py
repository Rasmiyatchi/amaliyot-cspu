"""Task, Journal, LessonAnalysis schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    JournalStatus,
    Semester,
    TaskCategory,
    TaskStatus,
    TaskType,
)


# ─── TaskTemplate ────────────────────────────────────────


class TaskTemplateRead(BaseModel):
    id: UUID
    practice_type_id: UUID
    course: int
    semester: Semester
    category: TaskCategory
    type: TaskType
    title: str
    description: str | None
    points: int
    quantity: int
    month_hint: str | None
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Task (instance) ────────────────────────────────────


class TaskSubmitRequest(BaseModel):
    submission_md: str = Field(..., min_length=1, max_length=50_000)
    attachments: list[dict[str, Any]] = Field(default_factory=list)


class TaskGradeRequest(BaseModel):
    """Supervisor: approve + ball (optional)."""

    points_earned: int | None = Field(None, ge=0, le=100)


class TaskRejectRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=3, max_length=2000)


class TaskRead(BaseModel):
    id: UUID
    assignment_id: UUID
    template_id: UUID
    # Template kontekst
    template_title: str
    template_type: TaskType
    template_category: TaskCategory
    template_course: int
    template_semester: Semester
    template_points: int
    template_quantity: int
    template_month_hint: str | None
    template_description: str | None

    status: TaskStatus
    submission_md: str | None
    attachments: list[dict[str, Any]] = []
    submitted_at: datetime | None
    points_earned: int | None
    graded_by_id: UUID | None
    graded_by_name: str | None = None
    graded_at: datetime | None
    rejection_reason: str | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── JournalEntry ───────────────────────────────────────


class JournalCreateRequest(BaseModel):
    date: datetime
    content_md: str = Field(..., min_length=1, max_length=20_000)
    attachments: list[dict[str, Any]] = Field(default_factory=list)


class JournalUpdateRequest(BaseModel):
    content_md: str | None = Field(None, min_length=1, max_length=20_000)
    attachments: list[dict[str, Any]] | None = None


class JournalRejectRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=3, max_length=2000)


class JournalRead(BaseModel):
    id: UUID
    assignment_id: UUID
    date: datetime
    content_md: str
    attachments: list[dict[str, Any]] = []
    status: JournalStatus
    approved_by_id: UUID | None
    approved_by_name: str | None = None
    approved_at: datetime | None
    rejection_reason: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── LessonAnalysis ─────────────────────────────────────


class LessonAnalysisCreateRequest(BaseModel):
    date: datetime
    subject: str = Field(..., min_length=1, max_length=200)
    teacher_name: str = Field(..., min_length=1, max_length=200)
    grade_level: str | None = Field(None, max_length=32)
    quarter: int = Field(..., ge=1, le=4)
    analysis_md: str = Field(..., min_length=1, max_length=30_000)
    attachments: list[dict[str, Any]] = Field(default_factory=list)


class LessonAnalysisUpdateRequest(BaseModel):
    date: datetime | None = None
    subject: str | None = Field(None, min_length=1, max_length=200)
    teacher_name: str | None = Field(None, min_length=1, max_length=200)
    grade_level: str | None = Field(None, max_length=32)
    quarter: int | None = Field(None, ge=1, le=4)
    analysis_md: str | None = Field(None, min_length=1, max_length=30_000)
    attachments: list[dict[str, Any]] | None = None


class LessonAnalysisRejectRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=3, max_length=2000)


class LessonAnalysisRead(BaseModel):
    id: UUID
    assignment_id: UUID
    date: datetime
    subject: str
    teacher_name: str
    grade_level: str | None
    quarter: int
    analysis_md: str
    attachments: list[dict[str, Any]] = []
    status: JournalStatus
    approved_by_id: UUID | None
    approved_by_name: str | None = None
    approved_at: datetime | None
    rejection_reason: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
