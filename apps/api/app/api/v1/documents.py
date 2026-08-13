"""Documents endpoints — admin yuklaydi, hamma rollar o'qiy oladi."""

from uuid import UUID

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, RequireAdmin
from app.db.session import SessionDep
from app.models.enums import DocumentKind
from app.schemas.document import DocumentCreate, DocumentRead, DocumentUpdate
from app.services import document as svc

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=list[DocumentRead])
async def list_documents(
    db: SessionDep,
    _: CurrentUser,
    kind: DocumentKind | None = None,
    practice_type_id: UUID | None = None,
    course: int | None = None,
    education_form: str | None = None,
    direction_id: UUID | None = None,
) -> list[DocumentRead]:
    items = await svc.list_documents(
        db,
        kind=kind,
        practice_type_id=practice_type_id,
        course=course,
        education_form=education_form,
        direction_id=direction_id,
    )
    return [DocumentRead.model_validate(i) for i in items]


@router.get("/{doc_id}", response_model=DocumentRead)
async def get_document(
    doc_id: UUID, db: SessionDep, _: CurrentUser
) -> DocumentRead:
    return DocumentRead.model_validate(await svc.get_document(db, doc_id))


@router.post(
    "",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: yangi hujjat (avval /uploads/file orqali fayl yuklang)",
)
async def create_document(
    data: DocumentCreate, db: SessionDep, user: RequireAdmin
) -> DocumentRead:
    return DocumentRead.model_validate(
        await svc.create_document(db, data, user.id)
    )


@router.patch("/{doc_id}", response_model=DocumentRead)
async def update_document(
    doc_id: UUID,
    data: DocumentUpdate,
    db: SessionDep,
    _: RequireAdmin,
) -> DocumentRead:
    return DocumentRead.model_validate(
        await svc.update_document(db, doc_id, data)
    )


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: UUID, db: SessionDep, _: RequireAdmin
) -> None:
    await svc.delete_document(db, doc_id)
