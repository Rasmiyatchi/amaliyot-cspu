"""RefreshToken — JWT refresh token DB storage (revocation + rotation uchun)."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class RefreshToken(UUIDMixin, TimestampMixin, Base):
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )

    # Token'ning SHA-256 hash'i — plaintext saqlamaymiz
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Rotation chain — qaysi tokenga almashtirildi
    replaced_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("refresh_tokens.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Audit
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv6 = 45 max

    @property
    def is_active(self) -> bool:
        """Token ishlatilishi mumkinmi — muddati o'tmagan va bekor qilinmagan."""
        from datetime import UTC

        now = datetime.now(UTC)
        return self.revoked_at is None and self.expires_at > now
