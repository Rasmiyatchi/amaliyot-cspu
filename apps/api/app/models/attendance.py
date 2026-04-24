"""Attendance — davomat modellari.

AttendanceDay: kunlik aggregate (assignment + date) — status (pending/green/red).
AttendanceEvent: har bir check-in/check-out urinishi — geo + accuracy audit.
AttendanceOverride: super admin tomonidan qizil→yashilga o'tkazish audit yozuvi.
"""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import AttendanceDayStatus, AttendanceEventKind


class AttendanceDay(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "attendance_days"
    __table_args__ = (
        UniqueConstraint("assignment_id", "date", name="uq_attendance_days_assignment_date"),
    )

    assignment_id: Mapped[UUID] = mapped_column(
        ForeignKey("practice_assignments.id", ondelete="CASCADE"), index=True
    )
    date: Mapped[date] = mapped_column(Date, index=True)

    status: Mapped[AttendanceDayStatus] = mapped_column(
        SAEnum(
            AttendanceDayStatus,
            name="attendance_day_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=AttendanceDayStatus.PENDING,
        server_default=AttendanceDayStatus.PENDING.value,
        index=True,
    )

    # Denormalizatsiya — eng so'nggi event'lar (tez o'qish uchun)
    check_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Supervizor tasdiqi
    approved_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Sabab/izoh (supervizor rad etganda yoki izoh qoldirganda)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<AttendanceDay assignment={self.assignment_id} date={self.date} {self.status}>"


class AttendanceEvent(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "attendance_events"

    attendance_day_id: Mapped[UUID] = mapped_column(
        ForeignKey("attendance_days.id", ondelete="CASCADE"), index=True
    )
    assignment_id: Mapped[UUID] = mapped_column(
        ForeignKey("practice_assignments.id", ondelete="CASCADE"), index=True
    )

    kind: Mapped[AttendanceEventKind] = mapped_column(
        SAEnum(
            AttendanceEventKind,
            name="attendance_event_kind",
            values_callable=lambda e: [m.value for m in e],
        ),
    )
    event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    # Geo
    lat: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    lng: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    accuracy_m: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    distance_m: Mapped[float | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="Obyekt markazigacha masofa (haversine) — audit uchun",
    )
    is_within_fence: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    # Qo'shimcha
    wifi_ssid: Mapped[str | None] = mapped_column(String(64), nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<AttendanceEvent {self.kind} at={self.event_at} within={self.is_within_fence}>"


class AttendanceOverride(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "attendance_overrides"

    attendance_day_id: Mapped[UUID] = mapped_column(
        ForeignKey("attendance_days.id", ondelete="CASCADE"), index=True
    )
    super_admin_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )

    previous_status: Mapped[AttendanceDayStatus] = mapped_column(
        SAEnum(
            AttendanceDayStatus,
            name="attendance_day_status",
            values_callable=lambda e: [m.value for m in e],
            create_type=False,
        ),
    )
    new_status: Mapped[AttendanceDayStatus] = mapped_column(
        SAEnum(
            AttendanceDayStatus,
            name="attendance_day_status",
            values_callable=lambda e: [m.value for m in e],
            create_type=False,
        ),
    )
    reason: Mapped[str] = mapped_column(Text)

    def __repr__(self) -> str:
        return f"<AttendanceOverride day={self.attendance_day_id} {self.previous_status}→{self.new_status}>"
