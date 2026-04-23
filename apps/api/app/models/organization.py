"""Organization — shartnomali obyekt (maktab/MTT/korxona)."""

from typing import Any

from sqlalchemy import ARRAY, Boolean, Integer, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import OrganizationKind


class Organization(UUIDMixin, TimestampMixin, Base):
    """Amaliyot o'tkaziladigan tashkilot — shartnomaga asosan."""

    # Identity
    name: Mapped[str] = mapped_column(String(200), index=True, comment="Masalan '48-maktab'")
    legal_name: Mapped[str | None] = mapped_column(
        String(300), nullable=True, comment="Shartnoma uchun to'liq yuridik nomi"
    )
    kind: Mapped[OrganizationKind] = mapped_column(
        SAEnum(
            OrganizationKind,
            name="organization_kind",
            values_callable=lambda e: [m.value for m in e],
        ),
        index=True,
    )

    # Rahbar (Director)
    director_full_name: Mapped[str] = mapped_column(String(200))
    director_position: Mapped[str | None] = mapped_column(
        String(100), nullable=True, default="Direktor"
    )

    # Manzil
    region: Mapped[str] = mapped_column(String(64), index=True)
    district: Mapped[str | None] = mapped_column(String(64), nullable=True)
    address_line: Mapped[str] = mapped_column(String(300), comment="Ko'cha, uy, kvartira")

    # Aloqa
    phone: Mapped[str] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fax: Mapped[str | None] = mapped_column(String(32), nullable=True)

    # Bank rekvizitlari (shartnoma uchun)
    inn: Mapped[str | None] = mapped_column(String(16), nullable=True, comment="INN")
    bank_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    bank_account: Mapped[str | None] = mapped_column(
        String(32), nullable=True, comment="H/R — hisob raqami"
    )
    bank_correspondent: Mapped[str | None] = mapped_column(
        String(32), nullable=True, comment="Sh/hr — shartnoma hisob raqami"
    )
    bank_mfo: Mapped[str | None] = mapped_column(String(16), nullable=True, comment="MFO")

    # Amaliyot sig'imi + ish rejimi
    capacity: Mapped[int] = mapped_column(
        Integer, default=10, server_default="10", comment="Max talabalar soni"
    )
    work_days: Mapped[list[int]] = mapped_column(
        ARRAY(Integer),
        default=list,
        server_default="{1,2,3,4,5}",
        comment="Hafta kunlari: 1=Du, 7=Ya",
    )
    work_hours: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default='{"start": "08:00", "end": "15:00"}',
    )

    # Geolokatsiya (Phase 7 — attendance geo-fence)
    geo_lat: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    geo_lng: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    geo_radius_m: Mapped[int] = mapped_column(
        Integer, default=100, server_default="100", comment="Check-in radius metrda"
    )
    wifi_ssids: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)),
        default=list,
        server_default="{}",
        comment="Attendance WiFi whitelist",
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    def __repr__(self) -> str:
        return f"<Organization {self.name} ({self.kind})>"
