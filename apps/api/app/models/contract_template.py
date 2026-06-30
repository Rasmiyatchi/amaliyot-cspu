"""ContractTemplate — super admin yuklaydigan DOCX shartnoma shablonlari.

Shablon ichida `{{ maydon }}` placeholder'lar bo'ladi (sana, ism, joy va h.k.).
Yuklanganda placeholder'lar avtomatik aniqlanadi. Shartnoma generatsiyasida
docxtpl bilan to'ldiriladi (QR rasm sifatida joylashtiriladi).
"""

from typing import Any
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class ContractTemplateDoc(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "contract_templates"

    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    practice_type_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("practice_types.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Yuklangan .docx fayl — uploads service dict (name, path, mime, size, ...)
    file_attachment: Mapped[dict[str, Any]] = mapped_column(JSONB)

    # Aniqlangan placeholder'lar ro'yxati — masalan ["ism", "sana", "tashkilot"]
    placeholders: Mapped[list[str]] = mapped_column(JSONB, default=list)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    created_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    def __repr__(self) -> str:
        return f"<ContractTemplate '{self.name}' ({len(self.placeholders or [])} maydon)>"
