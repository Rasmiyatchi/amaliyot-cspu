"""API v1 — barcha v1 router'lar shu joydan birlashtiriladi."""

from fastapi import APIRouter

from app.api.v1 import (
    academic,
    admins,
    archive,
    areas,
    attendance,
    auth,
    contracts,
    health,
    hemis,
    notifications,
    organizations,
    practice_assignments,
    practice_types,
    stats,
    students,
    supervisors,
    system_settings,
    tasks,
)

api_router = APIRouter(prefix="/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(academic.router)
api_router.include_router(students.router)
api_router.include_router(hemis.router)
api_router.include_router(practice_types.router)
api_router.include_router(organizations.router)
api_router.include_router(areas.router)
api_router.include_router(supervisors.router)
api_router.include_router(practice_assignments.router)
api_router.include_router(contracts.router)
api_router.include_router(attendance.router)
api_router.include_router(tasks.router)
api_router.include_router(archive.router)
api_router.include_router(stats.router)
api_router.include_router(notifications.router)
api_router.include_router(admins.router)
api_router.include_router(system_settings.router)
