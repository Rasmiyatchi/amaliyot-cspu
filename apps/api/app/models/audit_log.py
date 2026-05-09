"""AuditLog — kim, qachon, qaysi entity'ga qanday amal qilganini yozib boradi.

Faqat muhim ma'muriy amallar uchun (CRUD on students/supervisors/contracts,
attendance override, final report review, admin management).

Super admin'gina ko'rishi mumkin. RBAC kuzatuvi va xavfsizlik audit'lari uchun.
"""

from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class AuditLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "audit_logs"

    actor_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    actor_role: Mapped[str | None] = mapped_column(String(32), nullable=True)
    actor_name: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="Snapshot — user keyinroq o'chirilsa ham"
    )

    action: Mapped[str] = mapped_column(
        String(64),
        index=True,
        comment="create | update | delete | approve | reject | override | login_reset",
    )
    entity_type: Mapped[str] = mapped_column(String(64), index=True)
    entity_id: Mapped[UUID | None] = mapped_column(nullable=True, index=True)

    summary: Mapped[str] = mapped_column(
        String(500), comment="Human-readable: \"Talabani yaratdi: Karimov A.\""
    )
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True, comment="Qo'shimcha kontekst — before/after diff yoki sabab"
    )

    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} {self.entity_type} by {self.actor_name}>"
