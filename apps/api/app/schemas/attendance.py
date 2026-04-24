"""Attendance schemas."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AttendanceDayStatus, AttendanceEventKind


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
    lat: Decimal | None
    lng: Decimal | None
    accuracy_m: Decimal | None
    distance_m: Decimal | None
    is_within_fence: bool
    wifi_ssid: str | None
    device_id: str | None
    note: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Days ────────────────────────────────────────────────


class AttendanceDayRead(BaseModel):
    id: UUID
    assignment_id: UUID
    date: date
    status: AttendanceDayStatus
    check_in_at: datetime | None
    check_out_at: datetime | None
    approved_by_id: UUID | None
    approved_by_name: str | None = None
    approved_at: datetime | None
    note: str | None

    # Kontekst ma'lumotlari (listda)
    student_id: UUID | None = None
    student_full_name: str | None = None
    student_hemis_id: str | None = None
    organization_name: str | None = None
    area_name: str | None = None

    created_at: datetime
    updated_at: datetime

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
    new_status: AttendanceDayStatus = Field(
        ..., description="Yangi status (odatda 'green')"
    )
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
