"""API v1 — barcha v1 router'lar shu joydan birlashtiriladi."""

from fastapi import APIRouter

from app.api.v1 import (
    academic,
    areas,
    auth,
    health,
    hemis,
    organizations,
    practice_assignments,
    practice_types,
    students,
    supervisors,
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
