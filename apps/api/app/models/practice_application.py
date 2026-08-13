"""PracticeApplication — talaba shartnoma arizasi.

Talaba profiliga kirganda shartnoma TURINI (shablonini) tanlab, shablon
variablelari asosida dinamik formani to'ldirib ariza yuboradi. Super admin
QR kod bilan tasdiqlaganda tizim avtomatik shartnoma generatsiya qiladi —
takrorlanmas raqam, sana, QR va talaba ma'lumotlari ilovasi bilan.

variable_values: talaba kiritgan o'zgaruvchi qiymatlari
  {"organization_name": "12-son maktab", "organization_type": "Maktab", ...}
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import ApplicationStatus, OrganizationKind


class PracticeApplication(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "practice_applications"

    student_id: Mapped[UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True
    )

    # Tanlangan shartnoma turi (DOCX shablon)
    contract_template_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("contract_templates.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # ─── Eski ustunlar (backward compatibility uchun saqlanmoqda) ─────
    organization_type: Mapped[OrganizationKind] = mapped_column(
        SAEnum(
            OrganizationKind,
            name="organization_kind",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=OrganizationKind.OTHER,
    )
    organization_name: Mapped[str] = mapped_column(String(500), default="", server_default="")
    template_version: Mapped[int] = mapped_column(default=1, server_default="1")
    return_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Legacy ustunlar (orqaga moslashuvchanlik uchun vaqtincha qoldirildi)
    object_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    object_location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    manager_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    manager_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    region: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    district: Mapped[str | None] = mapped_column(String(64), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ─── Yangi: talaba kiritgan dinamik variable qiymatlari ──────────
    # Masalan: {"organization_name": "12-son maktab", "organization_type": "Maktab"}
    # Bu shablon variablelari (source=student_input) uchun qiymatlar
    variable_values: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True, default=None
    )

    status: Mapped[ApplicationStatus] = mapped_column(
        SAEnum(
            ApplicationStatus,
            name="application_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=ApplicationStatus.DRAFT,
        index=True,
    )

    # Tasdiqlanganda generatsiya qilinadigan QR token (ommaviy tekshirish uchun)
    qr_token: Mapped[str | None] = mapped_column(String(32), nullable=True, unique=True)

    # Tasdiqlanganda shakllanadigan shartnoma raqami + fayl (DOCX attachment dict)
    contract_number: Mapped[str | None] = mapped_column(
        String(64), nullable=True, unique=True
    )
    contract_file: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    scan_file: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    document_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    placeholders_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    reviewed_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<PracticeApplication {self.organization_name or 'N/A'} ({self.status})>"
