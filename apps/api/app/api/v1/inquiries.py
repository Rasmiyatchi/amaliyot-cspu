"""Talaba ↔ admin murojaat (inquiry/chat) endpointlari."""

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, RequireAdmin, RequireStudent
from app.db.session import SessionDep
from app.schemas.inquiry import (
    InquiryCreate,
    InquiryDetailRead,
    InquiryRead,
    MessageCreate,
)
from app.services import inquiry as svc

router = APIRouter(prefix="/inquiries", tags=["inquiries"])


# ─── Talaba ───────────────────────────────────────────────
@router.post("", response_model=InquiryRead, status_code=status.HTTP_201_CREATED)
async def create_inquiry(
    data: InquiryCreate, db: SessionDep, user: RequireStudent
) -> InquiryRead:
    return InquiryRead.model_validate(await svc.create_for_student(db, user, data))


@router.get("/my", response_model=list[InquiryRead])
async def my_inquiries(db: SessionDep, user: RequireStudent) -> list[InquiryRead]:
    return [InquiryRead.model_validate(r) for r in await svc.list_my(db, user)]


# ─── Admin ────────────────────────────────────────────────
@router.get("", response_model=list[InquiryRead])
async def list_inquiries(
    db: SessionDep,
    _: RequireAdmin,
    resolved: bool | None = Query(None),
) -> list[InquiryRead]:
    return [InquiryRead.model_validate(r) for r in await svc.list_all(db, resolved=resolved)]


@router.post("/{id_}/resolve", response_model=InquiryRead)
async def resolve_inquiry(
    id_: UUID, db: SessionDep, _: RequireAdmin, resolved: bool = Query(True)
) -> InquiryRead:
    return InquiryRead.model_validate(await svc.set_resolved(db, id_, resolved))


# ─── Umumiy (talaba o'ziniki, admin barchasi) ─────────────
@router.get("/{id_}", response_model=InquiryDetailRead)
async def get_inquiry(id_: UUID, db: SessionDep, user: CurrentUser) -> InquiryDetailRead:
    return InquiryDetailRead.model_validate(await svc.get_detail(db, user, id_))


@router.post("/{id_}/messages", response_model=InquiryDetailRead)
async def add_message(
    id_: UUID, data: MessageCreate, db: SessionDep, user: CurrentUser
) -> InquiryDetailRead:
    return InquiryDetailRead.model_validate(await svc.add_message(db, user, id_, data.body))
