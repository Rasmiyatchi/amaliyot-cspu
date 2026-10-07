"""FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
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
from app.services.access_restriction import AccessRestrictedError


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    setup_logging()
    logger.info(f"🚀 {settings.APP_NAME} v{__version__} starting in {settings.APP_ENV}")
    await run_seeds()
    yield
    logger.info("👋 Shutting down")


_FRAMEWORK_DETAILS = {
    "Not authenticated": "Tizimga kirish talab qilinadi",
    "Not Found": "Sahifa yoki manba topilmadi",
    "Method Not Allowed": "Bu so'rov usuli qo'llab-quvvatlanmaydi",
}


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=__version__,
        description="CHDPU talabalari amaliyotini boshqarish platformasi",
        docs_url="/docs" if settings.APP_DEBUG else None,
        redoc_url="/redoc" if settings.APP_DEBUG else None,
        # Production'da API sxemasi ochiq e'lon qilinmaydi (types:sync faqat dev'da ishlaydi)
        openapi_url="/openapi.json"
        if settings.APP_DEBUG or settings.APP_ENV != "production"
        else None,
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
            # FastAPI/Starlette'ning inglizcha standart xabarlari — avval o'zbekchaga
            detail = _FRAMEWORK_DETAILS.get(detail, detail)
            detail = translate_detail(detail, lang)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": detail},
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(AccessRestrictedError)
    async def access_restricted_handler(
        request: Request, exc: AccessRestrictedError
    ) -> JSONResponse:
        """423 Locked — super admin shu foydalanuvchi/guruh uchun kirishni to'xtatgan.
        Frontend `code` bo'yicha to'liq ekran ("texnik ishlar" yoki "kirish cheklangan")."""
        from app.core.i18n import pick_lang, translate_detail
        from app.services.access_restriction import DETAIL_BY_MODE

        lang = pick_lang(request.headers.get("accept-language"))
        r = exc.restriction
        mode = r["mode"]
        return JSONResponse(
            status_code=status.HTTP_423_LOCKED,
            content={
                "detail": translate_detail(DETAIL_BY_MODE[mode], lang),
                "code": "access_restricted",
                "mode": mode.value,
                "message": r.get("message"),
                "ends_at": r["ends_at"].isoformat() if r.get("ends_at") else None,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def localized_validation_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """422 — CLAUDE.md formati: {detail, code, field_errors}. `detail` — bitta o'qiladigan
        qator (frontend uni toast/alert'da ko'rsatadi), `field_errors` — maydon bo'yicha."""
        from app.core.i18n import pick_lang

        lang = pick_lang(request.headers.get("accept-language"))
        field_errors: dict[str, str] = {}
        for err in exc.errors():
            loc = [str(x) for x in err.get("loc", ()) if x not in ("body", "query", "path")]
            field = ".".join(loc) or "_"
            msg = str(err.get("msg", "")).removeprefix("Value error, ")
            field_errors.setdefault(field, msg)
        fields = ", ".join(f for f in field_errors if f != "_")
        if lang == "ru":
            summary = f"Неверные данные: {fields}" if fields else "Неверные данные запроса"
        else:
            summary = (
                f"Ma'lumotlar noto'g'ri: {fields}" if fields else "So'rov ma'lumotlari noto'g'ri"
            )
        return JSONResponse(
            status_code=422,
            content={"detail": summary, "code": "validation_error", "field_errors": field_errors},
        )

    @app.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {
            "name": settings.APP_NAME,
            "version": __version__,
            "docs": "/docs",
            "api": "/api/v1",
            "health": "/api/v1/health",
        }

    return app


app = create_app()
