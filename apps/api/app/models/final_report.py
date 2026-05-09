"""FinalReport — talaba amaliyotning oxirida 1 ta yakuniy hisobot yuklaydi.

Status oqimi:
- draft (talaba qoralama saqladi, hali yubormadi) — kelajakda kerak bo'lishi mumkin
- submitted — talaba topshirdi, ko'rib chiqish kutilmoqda
- approved — super admin (kafedra mudiri) tasdiqladi → arxiv yuklash mumkin
- rejected — sababi bilan rad etilgan, talaba qaytadan yuklashi mumkin

Bog'liqlik: 1 assignment → 0 yoki 1 ta final_report.
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import FinalReportStatus


class FinalReport(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "final_reports"
    __table_args__ = (
        UniqueConstraint("assignment_id", name="uq_final_reports_assignment"),
    )

    assignment_id: Mapped[UUID] = mapped_column(
        ForeignKey("practice_assignments.id", ondelete="CASCADE"),
        index=True,
    )

    title: Mapped[str] = mapped_column(String(500))
    file_attachment: Mapped[dict[str, Any]] = mapped_column(JSONB)

    status: Mapped[FinalReportStatus] = mapped_column(
        SAEnum(
            FinalReportStatus,
            name="final_report_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=FinalReportStatus.SUBMITTED,
        server_default=FinalReportStatus.SUBMITTED.value,
        index=True,
    )

    reviewer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reviewer_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<FinalReport assignment={self.assignment_id} status={self.status}>"
