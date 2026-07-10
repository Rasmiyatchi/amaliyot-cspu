"""Talaba amaliyot arizalari (PracticeApplication) endpointlari."""

from uuid import UUID

from fastapi import APIRouter, Query, status
from fastapi.responses import FileResponse

from app.api.deps import CurrentUser, RequireAdmin, RequireStudent, RequireSuperAdmin
from app.db.session import SessionDep
from app.models.enums import ApplicationStatus
from app.schemas.practice_application import (
    ApplicationCreate,
    ApplicationRead,
    ApplicationReview,
)
from app.services import practice_application as svc

router = APIRouter(prefix="/practice-applications", tags=["practice-applications"])

_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


# ─── Talaba ───────────────────────────────────────────────
@router.post("", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
async def create_application(
    data: ApplicationCreate, db: SessionDep, user: RequireStudent
) -> ApplicationRead:
    return ApplicationRead.model_validate(await svc.create_for_student(db, user, data))


@router.get("/my", response_model=list[ApplicationRead])
async def my_applications(db: SessionDep, user: RequireStudent) -> list[ApplicationRead]:
    return [ApplicationRead.model_validate(r) for r in await svc.list_my(db, user)]


@router.get("/contract-types")
async def contract_types(db: SessionDep, _: CurrentUser) -> list[dict]:
    """Talaba tanlashi mumkin bo'lgan shartnoma turlari (faol shablonlar)."""
    return await svc.list_contract_types(db)


@router.get("/{id_}/contract.docx")
async def download_contract(id_: UUID, db: SessionDep, user: CurrentUser) -> FileResponse:
    path, number = await svc.contract_file_path(db, user, id_)
    return FileResponse(path, media_type=_DOCX_MIME, filename=f"{number or 'shartnoma'}.docx")


# ─── Admin ────────────────────────────────────────────────
@router.get("", response_model=list[ApplicationRead])
async def list_applications(
    db: SessionDep,
    _: RequireAdmin,
    status_filter: ApplicationStatus | None = Query(None, alias="status"),
    region: str | None = None,
    search: str | None = Query(None, min_length=1, max_length=100),
) -> list[ApplicationRead]:
    rows = await svc.list_all(db, status_filter=status_filter, region=region, search=search)
    return [ApplicationRead.model_validate(r) for r in rows]


@router.get("/appendix")
async def appendix(db: SessionDep, _: RequireAdmin) -> list[dict]:
    """Ilova — hudud bo'yicha 2+ talabali guruhlar."""
    return await svc.appendix_by_region(db)


@router.get("/{id_}", response_model=ApplicationRead)
async def get_application(id_: UUID, db: SessionDep, _: RequireAdmin) -> ApplicationRead:
    return ApplicationRead.model_validate(await svc.get_one(db, id_))


# ─── Super Admin — QR tasdiq ──────────────────────────────
@router.post("/{id_}/approve", response_model=ApplicationRead)
async def approve_application(
    id_: UUID, db: SessionDep, user: RequireSuperAdmin
) -> ApplicationRead:
    return ApplicationRead.model_validate(await svc.approve(db, id_, user))


@router.post("/{id_}/reject", response_model=ApplicationRead)
async def reject_application(
    id_: UUID, data: ApplicationReview, db: SessionDep, user: RequireSuperAdmin
) -> ApplicationRead:
    return ApplicationRead.model_validate(await svc.reject(db, id_, user, data.review_note))
