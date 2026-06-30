"""Talaba amaliyot arizasi (PracticeApplication) schemalari."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import ApplicationStatus


class ApplicationCreate(BaseModel):
    object_name: str = Field(..., min_length=2, max_length=300)
    object_location: str = Field(..., min_length=2, max_length=500)
    manager_name: str | None = Field(None, max_length=200)
    manager_phone: str = Field(..., min_length=5, max_length=32)
    region: str | None = Field(None, max_length=64)
    district: str | None = Field(None, max_length=64)
    note: str | None = None


class ApplicationReview(BaseModel):
    review_note: str | None = Field(None, max_length=500)


class ApplicationRead(BaseModel):
    id: UUID
    student_id: UUID
    student_name: str | None = None
    direction_name: str | None = None
    group_name: str | None = None
    course: int | None = None
    object_name: str
    object_location: str
    manager_name: str | None = None
    manager_phone: str
    region: str | None = None
    district: str | None = None
    note: str | None = None
    status: ApplicationStatus
    qr_token: str | None = None
    reviewed_by_id: UUID | None = None
    reviewed_at: datetime | None = None
    review_note: str | None = None
    created_at: datetime
    updated_at: datetime
