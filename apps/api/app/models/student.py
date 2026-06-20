"""Student — User'ga bog'langan profil, HEMIS ma'lumotlari bilan."""

from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import DegreeType, EducationForm, Gender, StudentStatus


class Student(UUIDMixin, TimestampMixin, Base):
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )

    hemis_id: Mapped[str] = mapped_column(
        String(32),
        unique=True,
        index=True,
        comment="HEMIS Talaba ID — masalan '354231100457'",
    )

    # ─── Shaxsiy ma'lumot ──────────────────────────────────
    gender: Mapped[Gender | None] = mapped_column(
        SAEnum(Gender, name="gender", values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )
    # Maxfiylik: passport, JSHSHIR, tug'ilgan sana saqlanmaydi (foydalanuvchi talabi 2026-06-20)

    # ─── Manzil ────────────────────────────────────────────
    region: Mapped[str | None] = mapped_column(String(64), nullable=True)
    district: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # ─── Akademik ──────────────────────────────────────────
    group_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("groups.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    current_semester: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="1-8")
    is_graduating: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    enrollment_year: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ─── Ta'lim ────────────────────────────────────────────
    education_language: Mapped[str | None] = mapped_column(String(32), nullable=True)
    education_form: Mapped[EducationForm | None] = mapped_column(
        SAEnum(
            EducationForm,
            name="education_form",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=True,
    )
    degree_type: Mapped[DegreeType | None] = mapped_column(
        SAEnum(
            DegreeType,
            name="degree_type",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=True,
    )

    # ─── Status ────────────────────────────────────────────
    status: Mapped[StudentStatus] = mapped_column(
        SAEnum(
            StudentStatus,
            name="student_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=StudentStatus.STUDYING,
        server_default=StudentStatus.STUDYING.value,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<Student hemis_id={self.hemis_id} status={self.status}>"
