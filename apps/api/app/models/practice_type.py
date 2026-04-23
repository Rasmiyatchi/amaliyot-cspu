"""PracticeType — 8 xil amaliyot turi konfiguratsiyasi.

Har bir amaliyot turi:
- o'z obyekt turi (shartnomali tashkilot yoki ochiq hudud)
- davomiyligi (min/max hafta)
- ruxsat etilgan kurslar
- 100-ball tizimi bo'yicha baholash qoidalari (JSONB)
"""

from typing import Any

from sqlalchemy import ARRAY, Boolean, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import ObjectKind


class PracticeType(UUIDMixin, TimestampMixin, Base):
    """Amaliyot turi konfiguratsiyasi. 8 ta standart tur seed orqali yaratiladi."""

    code: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        comment="Masalan '4_plus_2_school', 'field_zoology'",
    )
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Shartnoma
    requires_contract: Mapped[bool] = mapped_column(Boolean, default=True)
    contract_template_ref: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        comment="'4_plus_2' | 'pedagogical' | 'qualifying' | null",
    )

    # Obyekt
    object_kind: Mapped[ObjectKind] = mapped_column(
        SAEnum(ObjectKind, name="object_kind", values_callable=lambda e: [m.value for m in e]),
    )

    # Davomiylik
    min_weeks: Mapped[int] = mapped_column(Integer)
    max_weeks: Mapped[int] = mapped_column(Integer)
    days_per_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hours_per_day: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Kurslar — PG int[] array
    allowed_courses: Mapped[list[int]] = mapped_column(
        ARRAY(Integer),
        default=list,
        server_default="{}",
        comment="Masalan {2,3,4} yoki {1,2}",
    )

    # Baholash (100-ball tizimi) — JSONB, Phase 9 da enforcement qilinadi
    grading_rules: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default="{}",
        comment="{min_total, criteria: [{key, name, max, grader}]}",
    )

    # Sillabus (markdown)
    syllabus_md: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Saqlash/tartiblash uchun
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    display_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    def __repr__(self) -> str:
        return f"<PracticeType {self.code} ({self.min_weeks}-{self.max_weeks} hafta)>"
