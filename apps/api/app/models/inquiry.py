"""Inquiry — talaba ↔ admin murojaat (kichik chat: xato/savol).

Inquiry = bitta suhbat (subject + tred). InquiryMessage = treddagi xabarlar.
"""

from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Inquiry(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "inquiries"

    student_id: Mapped[UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True
    )
    subject: Mapped[str] = mapped_column(String(200))
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    def __repr__(self) -> str:
        return f"<Inquiry '{self.subject}' resolved={self.is_resolved}>"


class InquiryMessage(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "inquiry_messages"

    inquiry_id: Mapped[UUID] = mapped_column(
        ForeignKey("inquiries.id", ondelete="CASCADE"), index=True
    )
    sender_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    from_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    body: Mapped[str] = mapped_column(Text)

    def __repr__(self) -> str:
        return f"<InquiryMessage from_admin={self.from_admin}>"
