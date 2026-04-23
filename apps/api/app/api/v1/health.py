"""Health check endpoints — container orchestrator'lar va monitoring uchun."""

from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app import __version__
from app.core.config import settings
from app.db.session import SessionDep

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    status: str
    version: str
    env: str
    timestamp: datetime


class DbHealthResponse(BaseModel):
    status: str
    database: str


@router.get("/health", response_model=HealthResponse, summary="App health")
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=__version__,
        env=settings.APP_ENV,
        timestamp=datetime.now(UTC),
    )


@router.get("/db-health", response_model=DbHealthResponse, summary="Database health")
async def db_health(db: SessionDep) -> DbHealthResponse:
    result = await db.execute(text("SELECT 1"))
    ok = result.scalar() == 1
    return DbHealthResponse(
        status="ok" if ok else "fail",
        database="connected" if ok else "disconnected",
    )
