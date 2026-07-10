"""Academic strukturasi: Faculty → Direction → Group + AcademicYear."""

from datetime import date
from uuid import UUID

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Faculty(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "faculties"

    name: Mapped[str] = mapped_column(String(200), unique=True)
    code: Mapped[str | None] = mapped_column(String(16), unique=True, nullable=True)

    def __repr__(self) -> str:
        return f"<Faculty {self.name}>"


class Department(UUIDMixin, TimestampMixin, Base):
    """Kafedra — fakultet tarkibidagi bo'lim."""

    __tablename__ = "departments"
    __table_args__ = (
        UniqueConstraint("faculty_id", "name", name="uq_departments_faculty_name"),
    )

    faculty_id: Mapped[UUID] = mapped_column(
        ForeignKey("faculties.id", ondelete="RESTRICT"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200))
    code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    def __repr__(self) -> str:
        return f"<Department {self.name}>"


class Direction(UUIDMixin, TimestampMixin, Base):
    """Ta'lim yo'nalishi — masalan '60110100 - Pedagogika'.

    Kod UNIKAL EMAS: bir kod bilan turli nomli yo'nalishlar bo'lishi mumkin.
    Faqat (kod + nom) juftligi takrorlanmas.
    """

    __tablename__ = "directions"
    __table_args__ = (
        UniqueConstraint("code", "name", name="uq_directions_code_name"),
    )

    faculty_id: Mapped[UUID] = mapped_column(
        ForeignKey("faculties.id", ondelete="RESTRICT"),
        index=True,
    )
    code: Mapped[str] = mapped_column(
        String(8),
        index=True,
        comment="HEMIS yo'nalish kodi, masalan 60110100 (unikal emas)",
    )
    name: Mapped[str] = mapped_column(String(200))

    def __repr__(self) -> str:
        return f"<Direction {self.code} {self.name}>"


class AcademicYear(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "academic_years"

    name: Mapped[str] = mapped_column(String(16), unique=True, comment="Masalan '2025-2026'")
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    # Faqat bitta active AY bo'lishi kerak — partial index migration'da qo'shiladi

    def __repr__(self) -> str:
        return f"<AcademicYear {self.name}{' (active)' if self.is_active else ''}>"


class Group(UUIDMixin, TimestampMixin, Base):
    """Talabalar guruhi — Direction + kurs + akademik yil bo'yicha."""

    __tablename__ = "groups"
    __table_args__ = (
        UniqueConstraint(
            "direction_id",
            "academic_year_id",
            "name",
            name="uq_groups_direction_year_name",
        ),
    )

    direction_id: Mapped[UUID] = mapped_column(
        ForeignKey("directions.id", ondelete="RESTRICT"),
        index=True,
    )
    academic_year_id: Mapped[UUID] = mapped_column(
        ForeignKey("academic_years.id", ondelete="RESTRICT"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(32), comment="Masalan '2301-01'")
    course: Mapped[int] = mapped_column(Integer, comment="1..5")

    def __repr__(self) -> str:
        return f"<Group {self.name} course={self.course}>"
