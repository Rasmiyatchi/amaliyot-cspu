"""SystemSettings — singleton row, key-value tipidagi global sozlamalar.

Bir nechta column'lar (typed) va `extra` JSONB — kelajakda osongina kengaytirish uchun.
Faqat 1 ta yozuv bo'ladi (id always = singleton row).
"""

from typing import Any

from sqlalchemy import ARRAY, Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class SystemSettings(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "system_settings"

    site_name: Mapped[str] = mapped_column(
        String(200),
        default="CHDPU Amaliyot Platformasi",
        server_default="CHDPU Amaliyot Platformasi",
    )
    site_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Fayl yuklash
    max_file_size_mb: Mapped[int] = mapped_column(
        Integer, default=10, server_default="10", comment="Yuklash limit (MB)"
    )
    allowed_file_types: Mapped[list[str]] = mapped_column(
        ARRAY(String(16)),
        default=lambda: ["pdf", "jpg", "jpeg", "png", "doc", "docx"],
        server_default="{pdf,jpg,jpeg,png,doc,docx}",
    )

    # Email
    email_notifications_enabled: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )

    # Maintenance
    maintenance_mode: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        comment="True bo'lsa — super admin'dan tashqari hammaga 503 qaytariladi",
    )
    maintenance_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Maintenance paytida ko'rsatish uchun xabar",
    )

    # Kelajak sozlamalar uchun JSONB
    extra: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default="{}"
    )

    def __repr__(self) -> str:
        return f"<SystemSettings maintenance={self.maintenance_mode}>"
