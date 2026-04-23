"""PracticeAssignment — talabaning amaliyotga biriktirilishi.

Bir talaba + bir amaliyot turi + (tashkilot yoki hudud) + sana.
"""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Text,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import AssignmentStatus


class PracticeAssignment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "practice_assignments"
    __table_args__ = (
        CheckConstraint(
            "(organization_id IS NOT NULL AND area_id IS NULL) "
            "OR (organization_id IS NULL AND area_id IS NOT NULL)",
            name="ck_practice_assignments_object_xor",
        ),
        CheckConstraint(
            "end_date >= start_date",
            name="ck_practice_assignments_date_order",
        ),
    )

    # Kim
    student_id: Mapped[UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True
    )

    # Qanday
    practice_type_id: Mapped[UUID] = mapped_column(
        ForeignKey("practice_types.id", ondelete="RESTRICT"), index=True
    )
    academic_year_id: Mapped[UUID] = mapped_column(
        ForeignKey("academic_years.id", ondelete="RESTRICT"), index=True
    )

    # Qayerda — XOR (faqat bittasi)
    organization_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    area_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("areas.id", ondelete="RESTRICT"), nullable=True, index=True
    )

    # Kim rahbar — optional (area uchun bo'lmasligi mumkin)
    supervisor_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("supervisors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Qachon
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)

    # Holat
    status: Mapped[AssignmentStatus] = mapped_column(
        SAEnum(
            AssignmentStatus,
            name="assignment_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=AssignmentStatus.DRAFT,
        server_default=AssignmentStatus.DRAFT.value,
        index=True,
    )

    # Yakuniy baho (Phase 9 da to'ldiriladi)
    final_grade: Mapped[int | None] = mapped_column(Integer, nullable=True)
    credit_earned: Mapped[bool] = mapped_column(
        default=False, server_default="false", nullable=False
    )

    # Bekor qilingan holatlar
    cancelled_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<PracticeAssignment student={self.student_id} status={self.status}>"
