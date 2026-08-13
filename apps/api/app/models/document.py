"""Document — amaliyot bo'yicha normativ hujjatlar va dasturlar.

Admin yuklaydi, supervizor va talabalar o'qiydi.

`kind`:
- regulation — Normativ hujjatlar (umumiy, amaliyot turidan mustaqil)
- program — Amaliyot dasturlari (har amaliyot turi uchun)
"""

from typing import Any
from uuid import UUID

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import DocumentKind


class Document(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "documents"

    kind: Mapped[DocumentKind] = mapped_column(
        SAEnum(
            DocumentKind,
            name="document_kind",
            values_callable=lambda e: [m.value for m in e],
        ),
        index=True,
    )
    practice_type_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("practice_types.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    course: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    education_form: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    direction_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("directions.id", ondelete="SET NULL"), nullable=True, index=True
    )

    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Single file attachment — uploads service'dan keladigan dict (name, path, mime, size, ...)
    file_attachment: Mapped[dict[str, Any]] = mapped_column(JSONB)

    created_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    def __repr__(self) -> str:
        return f"<Document {self.kind} '{self.title}'>"
