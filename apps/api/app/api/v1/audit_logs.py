"""Audit log endpoints — super admin only."""

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import RequireSuperAdmin
from app.db.session import SessionDep
from app.schemas.audit_log import AuditLogRead
from app.schemas.common import Paginated
from app.services import audit_log as svc

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("", response_model=Paginated[AuditLogRead])
async def list_audit_logs(
    db: SessionDep,
    _: RequireSuperAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    actor_user_id: UUID | None = None,
    action: str | None = None,
    entity_type: str | None = None,
) -> Paginated[AuditLogRead]:
    offset = (page - 1) * page_size
    items, total = await svc.list_logs(
        db,
        offset=offset,
        limit=page_size,
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
    )
    return Paginated(
        items=[AuditLogRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )
