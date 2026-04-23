"""Supervisor — User profili, tashkilotga biriktirilgan amaliyot rahbari."""

from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Supervisor(UUIDMixin, TimestampMixin, Base):
    """Amaliyot rahbari — tashkilotdagi yoki universitet xodimi."""

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )

    # Tashkilot — nullable (universitet ichidagi rahbar bo'lishi mumkin)
    organization_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Kasbiy ma'lumot
    position: Mapped[str] = mapped_column(String(100), comment="Lavozim, masalan 'O'qituvchi'")
    specialty: Mapped[str | None] = mapped_column(
        String(150), nullable=True, comment="Mutaxassislik"
    )
    experience_years: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Amaliyot statistikasi
    capacity: Mapped[int] = mapped_column(
        Integer, default=5, server_default="5", comment="Max biriktirilgan talabalar"
    )
    rating: Mapped[float] = mapped_column(
        Numeric(3, 2),
        default=0.0,
        server_default="0.00",
        comment="O'rtacha reyting (5 ball, Phase 9 da hisoblanadi)",
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    def __repr__(self) -> str:
        return f"<Supervisor user={self.user_id} org={self.organization_id}>"
