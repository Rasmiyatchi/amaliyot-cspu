"""Contract Pydantic schemas."""

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ContractStatus, ContractTemplate


class ContractStudentSnapshot(BaseModel):
    assignment_id: UUID | None = None
    hemis_id: str
    full_name: str
    direction_code: str
    direction_name: str
    course: int
    group_name: str | None = None
    start_date: date
    end_date: date


class ContractCreate(BaseModel):
    """Admin yaratish — mavjud assignments asosida (snapshot nusxa olinadi)."""

    template_ref: ContractTemplate
    organization_id: UUID
    academic_year_id: UUID
    practice_type_id: UUID
    assignment_ids: list[UUID] = Field(..., min_length=1, max_length=100)
    start_date: date
    end_date: date
    notes: str | None = None


class ContractUpdate(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None
    template_ref: ContractTemplate | None = None


class ContractRevoke(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class ContractRead(BaseModel):
    id: UUID
    number: str
    template_ref: ContractTemplate
    status: ContractStatus

    organization_id: UUID
    organization_name: str

    academic_year_id: UUID
    academic_year_name: str

    practice_type_id: UUID
    practice_type_name: str

    students: list[dict[str, Any]]
    students_count: int

    start_date: date
    end_date: date

    pdf_path: str | None
    scan_path: str | None
    qr_token: str

    generated_at: datetime | None
    signed_at_org: datetime | None
    revoked_reason: str | None
    revoked_at: datetime | None

    created_by_id: UUID
    created_by_name: str | None
    notes: str | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContractVerifyResponse(BaseModel):
    """Public verification response — QR kod orqali parolsiz ko'rish."""

    number: str
    template_ref: str
    status: str
    organization_name: str
    practice_type_name: str
    start_date: date
    end_date: date
    students_count: int
    generated_at: datetime | None
    signed_at_org: datetime | None
    revoked_reason: str | None
    revoked_at: datetime | None
    is_valid: bool
    pdf_url: str | None = None
