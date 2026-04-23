"""Contract — shartnoma modeli. PDF + QR kod + imzolangan skan."""

from datetime import date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import ContractStatus, ContractTemplate


class Contract(UUIDMixin, TimestampMixin, Base):
    # Identity
    number: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        comment="Masalan 'CHDPU-4+2-2025-0001'",
    )
    template_ref: Mapped[ContractTemplate] = mapped_column(
        SAEnum(
            ContractTemplate,
            name="contract_template",
            values_callable=lambda e: [m.value for m in e],
        ),
    )

    # Relations
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"), index=True
    )
    academic_year_id: Mapped[UUID] = mapped_column(
        ForeignKey("academic_years.id", ondelete="RESTRICT"), index=True
    )
    practice_type_id: Mapped[UUID] = mapped_column(
        ForeignKey("practice_types.id", ondelete="RESTRICT"), index=True
    )
    created_by_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )

    # Talaba snapshot — JSONB:
    # [{assignment_id, hemis_id, full_name, direction_code, direction_name,
    #   course, group_name, start_date, end_date}, ...]
    students: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, server_default="[]")

    # Davomiylik
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)

    # Status
    status: Mapped[ContractStatus] = mapped_column(
        SAEnum(
            ContractStatus,
            name="contract_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=ContractStatus.DRAFT,
        server_default=ContractStatus.DRAFT.value,
        index=True,
    )

    # Generated artifacts
    pdf_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    scan_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    qr_token: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        comment="Public verify URL token",
    )

    # Timestamps
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    signed_at_org: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="Skan yuklangan vaqt"
    )

    # Revocation
    revoked_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<Contract {self.number} status={self.status}>"
