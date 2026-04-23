"""API v1 — barcha v1 router'lar shu joydan birlashtiriladi."""

from fastapi import APIRouter

from app.api.v1 import auth, health

api_router = APIRouter(prefix="/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
