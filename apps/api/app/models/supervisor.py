"""Supervisor — User profili, tashkilot(lar)ga biriktirilgan amaliyot rahbari."""

from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class SupervisorOrganization(UUIDMixin, TimestampMixin, Base):
    """Supervizor ↔ tashkilot bog'lanishi (M2M, supervizorga maksimum 5 ta)."""

    __tablename__ = "supervisor_organizations"
    __table_args__ = (
        UniqueConstraint(
            "supervisor_id", "organization_id", name="uq_supervisor_organization"
        ),
    )

    supervisor_id: Mapped[UUID] = mapped_column(
        ForeignKey("supervisors.id", ondelete="CASCADE"), index=True
    )
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )


class Supervisor(UUIDMixin, TimestampMixin, Base):
    """Amaliyot rahbari — tashkilot(lar)dagi yoki universitet xodimi."""

    __tablename__ = "supervisors"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )

    # Akademik mansublik (yangi supervizor fakultet + kafedra bilan qo'shiladi)
    faculty_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("faculties.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    department_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"),
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
        return f"<Supervisor user={self.user_id} faculty={self.faculty_id}>"
