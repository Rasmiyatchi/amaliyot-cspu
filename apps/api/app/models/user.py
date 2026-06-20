"""User — auth identity model.

Talaba/supervizor/admin uchun umumiy — `role` maydoni farqni belgilaydi.
Profile detallari (Student, Supervisor) alohida jadvallarga ajratiladi keyingi bosqichlarda.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import UserRole


class User(UUIDMixin, TimestampMixin, Base):
    # Identity
    username: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        comment="Login uchun — HEMIS student_id yoki admin username",
    )
    email: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=True,
    )
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))

    # RBAC
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e]),
        index=True,
    )

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Force change password on next login (avto-generatsiyalangan parol uchun)
    must_change_password: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", index=True
    )

    # Qurilma bog'lash (asosan talaba uchun — bitta qurilmadan kirish)
    device_id: Mapped[str | None] = mapped_column(
        String(128), nullable=True, index=True, comment="Bog'langan qurilma fingerprint'i"
    )
    device_label: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="Qurilma tavsifi (user-agent)"
    )
    device_bound_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Profile (umumiy maydonlar — rol-specific detallari Student/Supervisor da)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    middle_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    @property
    def full_name(self) -> str:
        parts = [self.last_name, self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        return " ".join(parts)

    def __repr__(self) -> str:
        return f"<User {self.username} ({self.role})>"
