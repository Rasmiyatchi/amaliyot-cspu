"""Maintenance mode middleware.

Agar `system_settings.maintenance_mode = True` bo'lsa — barcha so'rovlarga 503 qaytariladi,
quyidagilardan tashqari:
- super_admin tokeni bilan kelgan so'rovlar
- /api/v1/auth/* (login + refresh)
- /api/v1/health
- /api/v1/system-settings/public (status ko'rish)
- /verify/* (public QR verify)
- / va /docs va /openapi.json (root + docs)
"""

from collections.abc import Awaitable, Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from jose import JWTError
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.security import TokenType, decode_token
from app.db.session import SessionLocal
from app.models.enums import UserRole
from app.models.system_settings import SystemSettings
from app.models.user import User

EXACT_ALLOWED: frozenset[str] = frozenset(
    {
        "/",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/api/v1/health",
        "/api/v1/system-settings/public",
    }
)

PREFIX_ALLOWED: tuple[str, ...] = (
    "/api/v1/auth/",
    "/verify/",
)


def _path_allowed(path: str) -> bool:
    if path in EXACT_ALLOWED:
        return True
    return any(path.startswith(p) for p in PREFIX_ALLOWED)


async def _is_super_admin(token: str | None) -> bool:
    if not token or not token.startswith("Bearer "):
        return False
    raw = token.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(raw, expected_type=TokenType.ACCESS)
    except JWTError:
        return False
    sub = payload.get("sub")
    if not sub:
        return False
    role_claim = payload.get("role")
    if role_claim == UserRole.SUPER_ADMIN.value:
        return True
    # Fallback — DB dan tekshirish (token role bo'lmasa)
    async with SessionLocal() as db:
        user = (
            await db.execute(select(User).where(User.id == sub).limit(1))
        ).scalar_one_or_none()
        return bool(user and user.role == UserRole.SUPER_ADMIN)


class MaintenanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        # OPTIONS so'rovlarini hech qachon bloklamaymiz (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if _path_allowed(path):
            return await call_next(request)

        # Maintenance flagini DB'dan tez o'qiymiz (cache yo'q — har request yengil 1 SELECT)
        async with SessionLocal() as db:
            row = (
                await db.execute(
                    select(
                        SystemSettings.maintenance_mode,
                        SystemSettings.maintenance_message,
                    ).limit(1)
                )
            ).first()

        if not row:
            return await call_next(request)

        maintenance, message = row
        if not maintenance:
            return await call_next(request)

        # Super admin'ga ruxsat — tokenni tekshiramiz
        auth_header = request.headers.get("authorization")
        if await _is_super_admin(auth_header):
            return await call_next(request)

        return JSONResponse(
            status_code=503,
            content={
                "detail": message
                or "Tizim profilaktika rejimida — keyinroq qayta urinib ko'ring",
                "code": "maintenance_mode",
            },
        )
