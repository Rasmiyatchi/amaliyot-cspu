"""PracticeApplication — talaba shartnoma arizasi.

Talaba profiliga kirganda shartnoma TURINI (shablonini) tanlab, obyekt
ma'lumotlarini (joylashuv, rahbar telefoni) kiritib ariza yuboradi. Super admin
QR kod bilan tasdiqlaganda tizim avtomatik shartnoma (DOCX) generatsiya qiladi —
takrorlanmas raqam, sana, QR va talaba ma'lumotlari ilovasi bilan.
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import ApplicationStatus


class PracticeApplication(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "practice_applications"

    student_id: Mapped[UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True
    )

    # Tanlangan shartnoma turi (DOCX shablon)
    contract_template_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("contract_templates.id", ondelete="SET NULL"), nullable=True, index=True
    )

    object_name: Mapped[str] = mapped_column(String(300))
    object_location: Mapped[str] = mapped_column(String(500))
    manager_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    manager_phone: Mapped[str] = mapped_column(String(32))

    region: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    district: Mapped[str | None] = mapped_column(String(64), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[ApplicationStatus] = mapped_column(
        SAEnum(
            ApplicationStatus,
            name="application_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=ApplicationStatus.PENDING,
        index=True,
    )

    # Tasdiqlanganda generatsiya qilinadigan QR token (ommaviy tekshirish uchun)
    qr_token: Mapped[str | None] = mapped_column(String(32), nullable=True, unique=True)

    # Tasdiqlanganda shakllanadigan shartnoma raqami + fayl (DOCX attachment dict)
    contract_number: Mapped[str | None] = mapped_column(
        String(64), nullable=True, unique=True
    )
    contract_file: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    reviewed_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<PracticeApplication {self.object_name} ({self.status})>"
