"""FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import __version__
from app.api.v1 import api_router
from app.api.v1.contracts import public_router as contracts_public_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.core.maintenance import MaintenanceMiddleware
from app.db.seed import run_seeds


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    setup_logging()
    logger.info(f"🚀 {settings.APP_NAME} v{__version__} starting in {settings.APP_ENV}")
    await run_seeds()
    yield
    logger.info("👋 Shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=__version__,
        description="CHDPU talabalari amaliyotini boshqarish platformasi",
        docs_url="/docs" if settings.APP_DEBUG else None,
        redoc_url="/redoc" if settings.APP_DEBUG else None,
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Maintenance — eng oxiri qo'shilgani uchun eng birinchi tekshiriladi.
    # super_admin va public path'lar (auth, health, verify) o'tib ketadi.
    app.add_middleware(MaintenanceMiddleware)

    app.include_router(api_router, prefix="/api")
    # Public (no /api prefix) — QR verify, auth talab qilmaydi
    app.include_router(contracts_public_router)

    # Xato xabarlari kodda o'zbekcha; Accept-Language: ru bo'lsa katalog orqali
    # tarjima qilinadi (app/core/i18n.py). Katalogda yo'q xabar o'zbekcha qoladi.
    @app.exception_handler(StarletteHTTPException)
    async def localized_http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        from app.core.i18n import pick_lang, translate_detail

        lang = pick_lang(request.headers.get("accept-language"))
        detail = exc.detail
        if isinstance(detail, str):
            detail = translate_detail(detail, lang)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": detail},
            headers=getattr(exc, "headers", None),
        )

    @app.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {
            "name": settings.APP_NAME,
            "version": __version__,
            "env": settings.APP_ENV,
            "docs": "/docs",
            "openapi": "/openapi.json",
            "api": "/api/v1",
            "health": "/api/v1/health",
        }

    return app


app = create_app()
