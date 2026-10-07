"""AccessRestriction — bitta foydalanuvchi yoki butun guruh uchun kirishni vaqtincha to'xtatish.

Super admin yaratadi. Cheklangan foydalanuvchi tizimga kira olmaydi (login va har bir
so'rov 423 qaytaradi), ekranida esa tanlangan rejim ko'rinadi: "texnik ishlar" yoki
"kirish cheklangan" (izoh bilan). `ends_at` o'tgach cheklov o'z-o'zidan tugaydi.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import RestrictionMode, RestrictionTarget


class AccessRestriction(UUIDMixin, TimestampMixin, Base):
    target_type: Mapped[RestrictionTarget] = mapped_column(
        SAEnum(
            RestrictionTarget,
            name="restriction_target",
            values_callable=lambda e: [m.value for m in e],
        )
    )
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    group_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), nullable=True, index=True
    )
    mode: Mapped[RestrictionMode] = mapped_column(
        SAEnum(
            RestrictionMode,
            name="restriction_mode",
            values_callable=lambda e: [m.value for m in e],
        )
    )
    #: Foydalanuvchiga ko'rinadigan matn (ixtiyoriy)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    #: Ichki sabab — faqat adminlar ko'radi
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    def __repr__(self) -> str:
        return f"<AccessRestriction {self.target_type} user={self.user_id} group={self.group_id}>"
