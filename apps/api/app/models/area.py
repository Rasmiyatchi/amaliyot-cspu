"""Area — hudud (shartnomasiz amaliyot obyekti)."""

from typing import Any

from sqlalchemy import Boolean, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Area(UUIDMixin, TimestampMixin, Base):
    """Hudud — dala/zoologiya/botanika/plener amaliyoti uchun (shartnomasiz).

    Masalan: 'Chimyon tog'i', 'Chorvoq suv ombori atrofi'.
    """

    name: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Manzil
    region: Mapped[str] = mapped_column(String(64), index=True)
    district: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Geolokatsiya — center point + GeoJSON polygon (chegaralar)
    geo_lat: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    geo_lng: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    geo_bounds: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True, comment="GeoJSON Polygon (optional)"
    )

    # Amaliyot sig'imi
    capacity: Mapped[int] = mapped_column(
        Integer, default=30, server_default="30", comment="Max talabalar soni"
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    def __repr__(self) -> str:
        return f"<Area {self.name}>"
