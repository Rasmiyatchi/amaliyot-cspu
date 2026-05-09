"""Final reports endpoints — talaba submit, super admin review."""

from uuid import UUID

from fastapi import APIRouter, Request, status

from app.api.deps import CurrentUser, RequireSuperAdmin
from app.db.session import SessionDep
from app.models.enums import FinalReportStatus
from app.schemas.final_report import (
    FinalReportRead,
    FinalReportReviewRequest,
    FinalReportSubmit,
)
from app.services import audit_log as audit
from app.services import final_report as svc

router = APIRouter(prefix="/final-reports", tags=["final-reports"])


@router.get("", response_model=list[FinalReportRead])
async def list_reports(
    db: SessionDep,
    _: RequireSuperAdmin,
    status_filter: FinalReportStatus | None = None,
) -> list[FinalReportRead]:
    """Super Admin: barcha hisobotlar (default: ko'rib chiqish kutayotganlar)."""
    items = await svc.list_reports(db, status_filter=status_filter)
    return [FinalReportRead.model_validate(i) for i in items]


@router.get("/by-assignment/{assignment_id}", response_model=FinalReportRead | None)
async def get_for_assignment(
    assignment_id: UUID, db: SessionDep, _: CurrentUser
) -> FinalReportRead | None:
    item = await svc.get_report_for_assignment(db, assignment_id)
    if not item:
        return None
    return FinalReportRead.model_validate(item)


@router.post(
    "/by-assignment/{assignment_id}",
    response_model=FinalReportRead,
    status_code=status.HTTP_201_CREATED,
    summary="Talaba: yakuniy hisobot yuborish (yangi yoki qayta)",
)
async def submit(
    assignment_id: UUID,
    data: FinalReportSubmit,
    db: SessionDep,
    user: CurrentUser,
) -> FinalReportRead:
    item = await svc.submit_report(
        db, user, assignment_id, data.title, data.file_attachment
    )
    return FinalReportRead.model_validate(item)


@router.post(
    "/{report_id}/review",
    response_model=FinalReportRead,
    summary="Super Admin: tasdiq yoki rad",
)
async def review(
    report_id: UUID,
    data: FinalReportReviewRequest,
    request: Request,
    db: SessionDep,
    user: RequireSuperAdmin,
) -> FinalReportRead:
    item = await svc.review_report(db, user, report_id, data.approve, data.note)
    await audit.log(
        db,
        actor=user,
        action="approve" if data.approve else "reject",
        entity_type="final_report",
        entity_id=report_id,
        summary=(
            f"Yakuniy hisobot {'tasdiqlandi' if data.approve else 'rad etildi'}: "
            f"{item.get('student_full_name') or '—'}"
        ),
        metadata={"note": data.note},
        request=request,
    )
    await db.commit()
    return FinalReportRead.model_validate(item)
