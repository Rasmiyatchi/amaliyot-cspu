"""Audit log service — yozish + ro'yxat olish."""

from typing import Any
from uuid import UUID

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User


def _full_name(user: User) -> str:
    parts = [user.last_name or "", user.first_name or ""]
    return " ".join(p for p in parts if p).strip() or user.username


async def log(
    db: AsyncSession,
    *,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: UUID | None,
    summary: str,
    metadata: dict[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    """Audit yozuvi qo'shadi. Hech qachon transaction'ni rollback qilmaydi.

    Asosiy commit'dan ALOHIDA flush qilinadi — caller commit qilishi kerak.
    Agar audit yozish o'zi xato bersa — silently log qilinadi (asosiy oqim
    yiqilmasligi uchun).
    """
    try:
        ip = None
        ua = None
        if request:
            ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            if not ip:
                ip = request.client.host if request.client else None
            ua = request.headers.get("user-agent")

        entry = AuditLog(
            actor_user_id=actor.id if actor else None,
            actor_role=actor.role.value if actor else None,
            actor_name=_full_name(actor) if actor else None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            summary=summary[:500],
            metadata_json=metadata,
            ip=ip,
            user_agent=ua,
        )
        db.add(entry)
        await db.flush()
    except Exception:
        # Audit log xatosi asosiy oqimni to'xtatmasin
        from loguru import logger

        logger.exception("Audit log yozishda xato")


async def list_logs(
    db: AsyncSession,
    *,
    offset: int = 0,
    limit: int = 50,
    actor_user_id: UUID | None = None,
    action: str | None = None,
    entity_type: str | None = None,
) -> tuple[list[AuditLog], int]:
    from sqlalchemy import func

    base = select(AuditLog).order_by(AuditLog.created_at.desc())
    count_base = select(func.count(AuditLog.id))

    if actor_user_id:
        base = base.where(AuditLog.actor_user_id == actor_user_id)
        count_base = count_base.where(AuditLog.actor_user_id == actor_user_id)
    if action:
        base = base.where(AuditLog.action == action)
        count_base = count_base.where(AuditLog.action == action)
    if entity_type:
        base = base.where(AuditLog.entity_type == entity_type)
        count_base = count_base.where(AuditLog.entity_type == entity_type)

    total = (await db.execute(count_base)).scalar_one()
    rows = (await db.execute(base.offset(offset).limit(limit))).scalars().all()
    return list(rows), total
