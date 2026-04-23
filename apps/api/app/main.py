"""FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app import __version__
from app.api.v1 import api_router
from app.core.config import settings
from app.core.logging import setup_logging
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

    app.include_router(api_router, prefix="/api")

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
