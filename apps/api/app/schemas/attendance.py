"""Attendance schemas."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import (
    AssignmentStatus,
    AttendanceDayStatus,
    AttendanceEventKind,
    Semester,
)

# ─── Events ──────────────────────────────────────────────


class CheckInRequest(BaseModel):
    """Talaba tomonidan yuboriladigan check-in."""

    lat: float | None = Field(None, ge=-90, le=90)
    lng: float | None = Field(None, ge=-180, le=180)
    accuracy_m: float | None = Field(None, ge=0, le=100000)
    wifi_ssid: str | None = Field(None, max_length=64)
    device_id: str | None = Field(None, max_length=128)
    note: str | None = None


class CheckOutRequest(CheckInRequest):
    """Check-out — check-in bilan bir xil payload."""


class AttendanceEventRead(BaseModel):
    id: UUID
    attendance_day_id: UUID
    assignment_id: UUID
    kind: AttendanceEventKind
    event_at: datetime
    lat: Decimal | float | None = None
    lng: Decimal | float | None = None
    accuracy_m: Decimal | float | None = None
    distance_m: Decimal | float | None = None
    is_within_fence: bool = False
    wifi_ssid: str | None = None
    device_id: str | None = None
    note: str | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


# ─── Days ────────────────────────────────────────────────


class AttendanceDayRead(BaseModel):
    id: UUID
    assignment_id: UUID
    date: date
    status: AttendanceDayStatus
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    approved_by_id: UUID | None = None
    approved_by_name: str | None = None
    approved_at: datetime | None = None
    note: str | None = None

    # Kontekst ma'lumotlari (listda)
    student_id: UUID | None = None
    student_full_name: str | None = None
    student_hemis_id: str | None = None
    organization_name: str | None = None
    area_name: str | None = None

    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AttendanceDayDetail(AttendanceDayRead):
    """Kunlik ma'lumot + shu kundagi barcha event'lar."""

    events: list[AttendanceEventRead] = []


# ─── Supervizor actions ──────────────────────────────────


class AttendanceApproveRequest(BaseModel):
    note: str | None = Field(None, max_length=2000)


class AttendanceRejectRequest(BaseModel):
    note: str = Field(..., min_length=3, max_length=2000, description="Rad etish sababi")


# ─── Super admin override ────────────────────────────────


class AttendanceOverrideRequest(BaseModel):
    new_status: AttendanceDayStatus = Field(..., description="Yangi status (odatda 'green')")
    reason: str = Field(..., min_length=3, max_length=2000)


class AttendanceOverrideRead(BaseModel):
    id: UUID
    attendance_day_id: UUID
    super_admin_id: UUID
    super_admin_name: str | None = None
    previous_status: AttendanceDayStatus
    new_status: AttendanceDayStatus
    reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Admin mark-red ─────────────────────────────────────


class AttendanceMarkRedRequest(BaseModel):
    """Admin tomonidan kunni qizilga belgilash (check-in qilmagan kunlar uchun)."""

    date: date
    note: str | None = Field(None, max_length=2000)


# ─── Bulk Action ─────────────────────────────────────────


class BulkAttendanceActionRequest(BaseModel):
    day_ids: list[UUID] = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Ommaviy o'zgartiriladigan kunlar ID ro'yxati",
    )
    status: AttendanceDayStatus = Field(..., description="Yangi status (green/red)")
    note: str | None = Field(None, max_length=2000)


class BulkAttendanceActionResult(BaseModel):
    updated_count: int
    requested_count: int


# ─── Super admin: kunni to'liq tahrirlash (upsert) ──────


class AttendanceDaySetRequest(BaseModel):
    """Super admin bitta kunni to'liq boshqaradi: status + vaqtlar + izoh.

    `check_in_at` / `check_out_at` berilmasa — o'zgarmaydi, `null` bo'lsa — tozalanadi.
    Kun mavjud bo'lmasa (masalan kelajakdagi kun) — yaratiladi (oldindan yashil belgilash).
    """

    model_config = ConfigDict(extra="forbid")

    status: AttendanceDayStatus
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    note: str | None = Field(None, max_length=2000)
    reason: str = Field(..., min_length=3, max_length=2000, description="O'zgartirish sababi")


class AttendanceRangeSetRequest(BaseModel):
    """Sana oralig'ini (yoki butun oyni) oldindan yashil/qizil belgilash."""

    model_config = ConfigDict(extra="forbid")

    date_from: date
    date_to: date
    status: AttendanceDayStatus = Field(..., description="green yoki red")
    reason: str = Field(..., min_length=3, max_length=2000)
    only_required_weekdays: bool = Field(
        True, description="Faqat majburiy hafta kunlari (yo'q bo'lsa Du–Sha) belgilanadi"
    )
    mode: Literal["fill", "overwrite"] = Field(
        "fill",
        description="fill — faqat yozuvi yo'q yoki kutilayotgan kunlar; overwrite — barcha kunlar",
    )

    @model_validator(mode="after")
    def _check(self) -> AttendanceRangeSetRequest:
        if self.date_to < self.date_from:
            raise ValueError("date_to sanasi date_from dan oldin bo'lishi mumkin emas")
        if (self.date_to - self.date_from).days > 366:
            raise ValueError("Oraliq 366 kundan oshmasligi kerak")
        if self.status == AttendanceDayStatus.PENDING:
            raise ValueError("Oraliq uchun faqat green yoki red status beriladi")
        return self


class AttendanceRangeSetResult(BaseModel):
    created: int
    updated: int
    skipped: int
    total_days: int
    date_from: date
    date_to: date


class AttendanceBulkRangeSetRequest(AttendanceRangeSetRequest):
    assignment_ids: list[UUID] = Field(..., min_length=1, max_length=500)


class AttendanceBulkRangeSetError(BaseModel):
    assignment_id: UUID
    error: str


class AttendanceBulkRangeSetResult(BaseModel):
    assignments: int
    created: int
    updated: int
    skipped: int
    failed: list[AttendanceBulkRangeSetError]


# ─── Talaba-markazli jamlanma (summary) ──────────────────


class AttendanceSummaryRow(BaseModel):
    """Bir biriktirish = bir qator: talaba + obyekt + davomat ko'rsatkichlari."""

    assignment_id: UUID
    student_id: UUID
    student_full_name: str
    student_hemis_id: str | None = None
    student_username: str | None = None
    group_name: str | None = None
    course: int | None = None
    direction_name: str | None = None
    faculty_name: str | None = None
    practice_type_name: str | None = None
    organization_name: str | None = None
    area_name: str | None = None
    supervisor_full_name: str | None = None
    start_date: date
    end_date: date
    required_weekdays: list[int] | None = None
    assignment_status: AssignmentStatus
    semester: Semester | None = None
    expected_days_to_date: int | None = None
    green_count: int = 0
    red_count: int = 0
    pending_count: int = 0
    total_records: int = 0
    attendance_percent: int | None = None
    last_check_in_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
