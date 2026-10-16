"""System Settings endpoints.

- GET /system-settings — barcha admin (super_admin va admin) ko'radi
- PATCH /system-settings — faqat super_admin
- GET /system-settings/public — auth talab qilmaydi, login sahifasi uchun
"""

from fastapi import APIRouter, Request

from app.api.deps import RequireAdmin, RequireSuperAdmin, RequireSystem
from app.db.session import SessionDep
from app.schemas.system_settings import (
    AttendanceSettingsRead,
    SystemSettingsPublic,
    SystemSettingsRead,
    SystemSettingsUpdate,
)
from app.services import audit_log as audit
from app.services import system_settings as svc

router = APIRouter(prefix="/system-settings", tags=["system-settings"])


@router.get("/public", response_model=SystemSettingsPublic, summary="Public — auth yo'q")
async def get_public(db: SessionDep) -> SystemSettingsPublic:
    data = await svc.get_settings(db)
    return SystemSettingsPublic(
        site_name=data["site_name"],
        site_description=data["site_description"],
        maintenance_mode=data["maintenance_mode"],
        maintenance_message=data["maintenance_message"],
    )


@router.get("", response_model=SystemSettingsRead)
async def get_settings(db: SessionDep, _: RequireSystem) -> SystemSettingsRead:
    return SystemSettingsRead.model_validate(await svc.get_settings(db))


@router.get(
    "/attendance",
    response_model=AttendanceSettingsRead,
    summary="Davomat sozlamalari (kunlik majburiy vaqt) — har qanday admin",
)
async def get_attendance_settings(db: SessionDep, _: RequireAdmin) -> AttendanceSettingsRead:
    data = await svc.get_settings(db)
    return AttendanceSettingsRead(min_practice_minutes=data["min_practice_minutes"])


@router.patch("", response_model=SystemSettingsRead, summary="Super admin only")
async def update_settings(
    data: SystemSettingsUpdate, request: Request, db: SessionDep, user: RequireSuperAdmin
) -> SystemSettingsRead:
    before = await svc.get_settings(db)
    after = await svc.update_settings(db, data)
    fields = list(data.model_dump(exclude_unset=True).keys())
    changes = audit.diff(before, after, fields)
    if changes:
        await audit.log(
            db,
            actor=user,
            action="update",
            entity_type="system_settings",
            entity_id=after["id"],
            summary="Tizim sozlamalari o'zgartirildi: " + ", ".join(c["field"] for c in changes),
            metadata={"changes": changes},
            request=request,
        )
        await db.commit()
    return SystemSettingsRead.model_validate(after)


# Bazani tozalash HTTP orqali ATAYLAB yo'q — faqat CLI: scripts/clean_and_reset_data.py
