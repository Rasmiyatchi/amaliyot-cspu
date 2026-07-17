"""PracticeAssignment — talabaning amaliyotga biriktirilishi.

Bir talaba + bir amaliyot turi + (tashkilot yoki hudud) + sana.
"""

from datetime import date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import (
    ARRAY,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Text,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import AssignmentStatus, Semester


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

    # Semestr — 4+2 kabi yillik amaliyotlarda kuzgi va bahorgi baho ALOHIDA chiqadi,
    # shuning uchun har semestr o'z biriktirishi va o'z 100 balli bahosi bilan yuritiladi.
    # Qisqa (dala, plener) amaliyotlar uchun NULL.
    semester: Mapped[Semester | None] = mapped_column(
        SAEnum(
            Semester,
            name="semester",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=True,
        index=True,
    )

    # Talaba haftaning qaysi kunlari borishi shart — ISO raqamlash: 1=Dushanba ... 7=Yakshanba.
    # Davomat foizining MAXRAJI shu kunlardan hisoblanadi (bo'sh bo'lsa — eski xatti-harakat:
    # maxraj = mavjud yozuvlar soni).
    required_weekdays: Mapped[list[int] | None] = mapped_column(
        ARRAY(Integer),
        nullable=True,
        comment="ISO hafta kunlari (1=Du..7=Ya) — davomat foizi maxraji",
    )

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

    # Yakuniy baho — grading.compute_breakdown() natijasi, finalize_grade() yozadi.
    final_grade: Mapped[int | None] = mapped_column(Integer, nullable=True)
    credit_earned: Mapped[bool] = mapped_column(
        default=False, server_default="false", nullable=False
    )

    # Qo'lda qo'yiladigan mezon ballari: {"events": 18, "defense": 9}.
    # grader="system" mezonlar (davomat, topshiriqlar) bu yerda SAQLANMAYDI —
    # ular har safar davomat/topshiriq ma'lumotidan qayta hisoblanadi.
    criteria_scores: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default="{}",
        nullable=False,
        comment="Qo'lda baholanadigan mezonlar: {mezon_key: ball}",
    )

    # Bekor qilingan holatlar
    cancelled_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<PracticeAssignment student={self.student_id} status={self.status}>"
