"""System Settings endpoints.

- GET /system-settings — barcha admin (super_admin va admin) ko'radi
- PATCH /system-settings — faqat super_admin
- GET /system-settings/public — auth talab qilmaydi, login sahifasi uchun
"""

from fastapi import APIRouter

from app.api.deps import RequireAdmin, RequireSuperAdmin
from app.db.session import SessionDep
from app.schemas.system_settings import (
    SystemSettingsPublic,
    SystemSettingsRead,
    SystemSettingsUpdate,
)
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
async def get_settings(db: SessionDep, _: RequireAdmin) -> SystemSettingsRead:
    return SystemSettingsRead.model_validate(await svc.get_settings(db))


@router.patch("", response_model=SystemSettingsRead, summary="Super admin only")
async def update_settings(
    data: SystemSettingsUpdate, db: SessionDep, _: RequireSuperAdmin
) -> SystemSettingsRead:
    return SystemSettingsRead.model_validate(await svc.update_settings(db, data))


@router.post("/reset-database", summary="Super admin only — Bazani 0 dan tozalash")
async def reset_database(db: SessionDep, _: RequireSuperAdmin) -> dict:
    from app.services.data_cleaner import reset_all_data

    counts = await reset_all_data(db)
    return {"message": "Baza muvaffaqiyatli tozalandi", "counts": counts}

