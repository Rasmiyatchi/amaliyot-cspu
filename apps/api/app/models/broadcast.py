"""Broadcast — admin yuborgan ommaviy xabar tarixi.

Har bir qabul qiluvchiga alohida `Notification` (type=broadcast) yoziladi; bu jadval esa
"nima, kimga, qachon, nechta" ni saqlaydi — yuborish tarixi va audit uchun.
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Broadcast(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "broadcasts"

    sender_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    sender_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # all_students | faculty | group | students | supervisors | everyone
    audience: Mapped[str] = mapped_column(String(32))
    faculty_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("faculties.id", ondelete="SET NULL"), nullable=True
    )
    faculty_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    group_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("groups.id", ondelete="SET NULL"), nullable=True
    )
    group_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    target_user_ids: Mapped[list[Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Tanlangan talabalar (user_id ro'yxati) — audience='students' bo'lsa",
    )

    subject: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    recipients_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    def __repr__(self) -> str:
        return f"<Broadcast {self.audience} n={self.recipients_count} '{self.subject[:30]}'>"
