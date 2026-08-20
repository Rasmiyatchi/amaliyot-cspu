"""Stats endpoints — role-aware dashboard'lar uchun KPI'lar."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import CurrentUser
from app.db.session import SessionDep
from app.models.enums import UserRole
from app.services import stats as svc
from app.services.pdf import render_dashboard_stats_pdf

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get(
    "/report.pdf",
    summary="Super Admin / Admin: Dashboard statistika hisoboti (PDF)",
)
async def dashboard_stats_pdf(db: SessionDep, user: CurrentUser) -> Response:
    if user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    stats_data = (
        await svc.super_admin_overview(db)
        if user.role == UserRole.SUPER_ADMIN
        else await svc.admin_overview(db)
    )
    admin_name = (
        f"{user.last_name or ''} {user.first_name or ''}".strip() or user.username
    )
    pdf_bytes = render_dashboard_stats_pdf(stats_data, admin_name)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"amaliyot_statistikasi_{ts}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/admin",
    response_model=dict,
    summary="Admin bosh sahifasi KPI'lari",
)
async def admin_stats(db: SessionDep, user: CurrentUser) -> dict[str, Any]:
    if user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    return await svc.admin_overview(db)


@router.get(
    "/super-admin",
    response_model=dict,
    summary="Super admin: admin stats + override queue + users",
)
async def super_admin_stats(db: SessionDep, user: CurrentUser) -> dict[str, Any]:
    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    return await svc.super_admin_overview(db)


@router.get(
    "/supervisor",
    response_model=dict,
    summary="Supervizor bosh sahifasi KPI'lari",
)
async def supervisor_stats(db: SessionDep, user: CurrentUser) -> dict[str, Any]:
    if user.role not in (UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    return await svc.supervisor_overview(db, user)


@router.get(
    "/student",
    response_model=dict | None,
    summary="Talaba bosh sahifasi KPI'lari (aktiv assignment)",
)
async def student_stats(db: SessionDep, user: CurrentUser) -> dict[str, Any] | None:
    if user.role not in (UserRole.STUDENT, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    return await svc.student_overview(db, user)
