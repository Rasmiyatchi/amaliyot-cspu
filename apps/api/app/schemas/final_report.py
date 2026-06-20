"""FinalReport schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import FinalReportStatus


class FinalReportRead(BaseModel):
    id: UUID
    assignment_id: UUID
    student_full_name: str | None = None
    group_name: str | None = None
    practice_type_name: str | None = None
    final_grade: int | None = None
    credit_earned: bool | None = None
    title: str
    file_attachment: dict[str, Any]
    status: FinalReportStatus
    reviewer_id: UUID | None = None
    reviewer_name: str | None = None
    reviewer_note: str | None = None
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FinalReportSubmit(BaseModel):
    """Talaba: hisobot yuborish/qayta yuborish."""

    title: str = Field(..., min_length=1, max_length=500)
    file_attachment: dict[str, Any]


class FinalReportReviewRequest(BaseModel):
    """Super admin: tasdiq yoki rad."""

    approve: bool
    note: str | None = Field(None, max_length=2000)
