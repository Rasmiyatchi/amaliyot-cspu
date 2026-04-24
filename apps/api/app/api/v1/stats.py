"""Stats endpoints — role-aware dashboard'lar uchun KPI'lar."""

from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser
from app.db.session import SessionDep
from app.models.enums import UserRole
from app.services import stats as svc

router = APIRouter(prefix="/stats", tags=["stats"])


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
