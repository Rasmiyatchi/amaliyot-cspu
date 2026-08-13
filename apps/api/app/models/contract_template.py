"""ContractTemplate — super admin yuklaydigan DOCX shartnoma shablonlari.

Shablon ichida `{{ maydon }}` placeholder'lar bo'ladi (sana, ism, joy va h.k.).
Yuklanganda placeholder'lar avtomatik aniqlanadi. Shartnoma generatsiyasida
docxtpl bilan to'ldiriladi (QR rasm sifatida joylashtiriladi).

Har bir o'zgaruvchi uchun `variables` JSONB ustunida metadata saqlanadi:
  key, label, type, required, source, options, placeholder, defaultValue
source = "system" → tizimdan avtomatik olinadi (talaba profili, sana va h.k.)
source = "student_input" → talaba kiritishi kerak
"""

from typing import Any
from uuid import UUID

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

# NOTE: html_content ustuni qo'shildi — shartnoma shablonini WYSIWYG editor orqali
# to'g'ridan-to'g'ri bazada saqlash uchun.
from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import ContractTemplateStatus


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
    file_attachment: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    # WYSIWYG editor orqali saqlangan HTML kontent
    html_content: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Eski placeholder'lar ro'yxati — backward compatibility uchun qoldirildi
    placeholders: Mapped[list[str]] = mapped_column(JSONB, default=list)

    # Yangi: har bir o'zgaruvchi uchun to'liq metadata
    # [{key, label, type, required, source, options, placeholder, defaultValue}, ...]
    variables: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, server_default="[]"
    )

    status: Mapped[ContractTemplateStatus] = mapped_column(
        SAEnum(
            ContractTemplateStatus,
            name="contract_template_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=ContractTemplateStatus.DRAFT,
        index=True,
    )

    created_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    def __repr__(self) -> str:
        n = len(self.variables or self.placeholders or [])
        return f"<ContractTemplate '{self.name}' ({n} maydon)>"
