"""Audit log endpoints — super admin only. Faqat o'qish va eksport: jurnal append-only."""

from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from app.api.deps import RequireSuperAdmin
from app.core.clock import UZB_TZ
from app.db.session import SessionDep
from app.schemas.audit_log import AuditLogRead
from app.schemas.common import Paginated
from app.services import audit_log as svc

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _check_range(date_from: date | None, date_to: date | None) -> None:
    if date_from and date_to and date_to < date_from:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Sana oralig'i noto'g'ri")


@router.get("", response_model=Paginated[AuditLogRead])
async def list_audit_logs(
    db: SessionDep,
    _: RequireSuperAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    actor_user_id: UUID | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = Query(None, min_length=1, max_length=100),
    faculty_id: UUID | None = None,
    exclude_action: list[str] | None = Query(None, description="Yashiriladigan amallar"),
) -> Paginated[AuditLogRead]:
    _check_range(date_from, date_to)
    offset = (page - 1) * page_size
    items, total = await svc.list_logs(
        db,
        offset=offset,
        limit=page_size,
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        date_from=date_from,
        date_to=date_to,
        search=search,
        faculty_id=faculty_id,
        exclude_actions=exclude_action,
    )
    return Paginated(
        items=[AuditLogRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/actions", response_model=list[str], summary="Jurnalda uchragan amal turlari")
async def audit_actions(db: SessionDep, _: RequireSuperAdmin) -> list[str]:
    return await svc.list_actions(db)


@router.get("/export.xlsx", summary="Audit jurnali — Excel (filtrlar bilan)")
async def export_audit_logs(
    request: Request,
    db: SessionDep,
    user: RequireSuperAdmin,
    actor_user_id: UUID | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = Query(None, min_length=1, max_length=100),
    faculty_id: UUID | None = None,
    exclude_action: list[str] | None = Query(None),
) -> Response:
    _check_range(date_from, date_to)
    content, exported, total = await svc.export_logs(
        db,
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        date_from=date_from,
        date_to=date_to,
        search=search,
        faculty_id=faculty_id,
        exclude_actions=exclude_action,
    )
    # Eksportning o'zi ham jurnalga tushadi
    await svc.log(
        db,
        actor=user,
        action="export",
        entity_type="audit_log",
        entity_id=None,
        summary=f"Audit jurnali eksport qilindi ({exported} ta yozuv)",
        metadata={
            "affected_count": exported,
            "total_matched": total,
            "truncated": total > exported,
            "filters": {
                "actor_user_id": actor_user_id,
                "action": action,
                "entity_type": entity_type,
                "date_from": date_from,
                "date_to": date_to,
                "search": search,
                "faculty_id": faculty_id,
                "exclude_action": exclude_action,
            },
        },
        request=request,
    )
    await db.commit()
    ts = datetime.now(UZB_TZ).strftime("%Y%m%d_%H%M")
    return Response(
        content=content,
        media_type=_XLSX_MIME,
        headers={
            "Content-Disposition": f'attachment; filename="audit_{ts}.xlsx"',
            "X-Export-Rows": str(exported),
            "X-Export-Total": str(total),
        },
    )
