"""PracticeAssignment schemas."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AssignmentStatus


class PracticeAssignmentCreate(BaseModel):
    student_id: UUID
    practice_type_id: UUID
    academic_year_id: UUID
    organization_id: UUID | None = None
    area_id: UUID | None = None
    supervisor_id: UUID | None = None
    start_date: date
    end_date: date
    notes: str | None = None


class PracticeAssignmentBulkCreate(BaseModel):
    """Ko'p talabani bir xil amaliyotga biriktirish (masalan butun guruh)."""

    student_ids: list[UUID] = Field(..., min_length=1, max_length=200)
    practice_type_id: UUID
    academic_year_id: UUID
    organization_id: UUID | None = None
    area_id: UUID | None = None
    supervisor_id: UUID | None = None
    start_date: date
    end_date: date
    notes: str | None = None


class PracticeAssignmentUpdate(BaseModel):
    organization_id: UUID | None = None
    area_id: UUID | None = None
    supervisor_id: UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: AssignmentStatus | None = None
    final_grade: int | None = Field(None, ge=0, le=100)
    credit_earned: bool | None = None
    cancelled_reason: str | None = None
    notes: str | None = None


class PracticeAssignmentRead(BaseModel):
    id: UUID

    # Student
    student_id: UUID
    student_full_name: str
    student_hemis_id: str
    student_group_name: str | None
    student_course: int | None

    # Practice Type
    practice_type_id: UUID
    practice_type_code: str
    practice_type_name: str
    requires_contract: bool

    # Academic Year
    academic_year_id: UUID
    academic_year_name: str

    # Obyekt (XOR)
    organization_id: UUID | None
    organization_name: str | None
    area_id: UUID | None
    area_name: str | None

    # Supervisor
    supervisor_id: UUID | None
    supervisor_full_name: str | None

    # Sana + status
    start_date: date
    end_date: date
    status: AssignmentStatus
    final_grade: int | None
    credit_earned: bool

    cancelled_reason: str | None
    cancelled_at: datetime | None
    notes: str | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BulkAssignmentError(BaseModel):
    student_id: UUID
    error: str


class BulkAssignmentResult(BaseModel):
    requested: int
    created: int
    failed: list[BulkAssignmentError]
    assignment_ids: list[UUID]
