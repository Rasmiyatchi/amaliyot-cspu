"""Document service — CRUD."""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.enums import DocumentKind
from app.models.practice_type import PracticeType
from app.models.user import User


def _row_to_dict(row: Any) -> dict[str, Any]:
    """Document row + practice_type_name + created_by_name."""
    doc = row[0] if isinstance(row, tuple) else row
    pt_name = row[1] if isinstance(row, tuple) and len(row) > 1 else None
    user_name = row[2] if isinstance(row, tuple) and len(row) > 2 else None
    return {
        "id": doc.id,
        "kind": doc.kind,
        "practice_type_id": doc.practice_type_id,
        "practice_type_name": pt_name,
        "course": doc.course,
        "education_form": doc.education_form,
        "direction_id": doc.direction_id,
        "title": doc.title,
        "description": doc.description,
        "file_attachment": doc.file_attachment,
        "created_by_id": doc.created_by_id,
        "created_by_name": user_name,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
    }


async def list_documents(
    db: AsyncSession,
    *,
    kind: DocumentKind | None = None,
    practice_type_id: UUID | None = None,
    course: int | None = None,
    education_form: str | None = None,
    direction_id: UUID | None = None,
) -> list[dict[str, Any]]:
    stmt = (
        select(
            Document,
            PracticeType.name.label("practice_type_name"),
            User.first_name.label("user_first"),
            User.last_name.label("user_last"),
        )
        .outerjoin(PracticeType, PracticeType.id == Document.practice_type_id)
        .outerjoin(User, User.id == Document.created_by_id)
        .order_by(Document.created_at.desc())
    )
    if kind:
        stmt = stmt.where(Document.kind == kind)
    if practice_type_id:
        stmt = stmt.where(Document.practice_type_id == practice_type_id)
    if course is not None:
        stmt = stmt.where(Document.course == course)
    if education_form:
        stmt = stmt.where(Document.education_form == education_form)
    if direction_id:
        stmt = stmt.where(Document.direction_id == direction_id)

    rows = (await db.execute(stmt)).all()
    out: list[dict[str, Any]] = []
    for r in rows:
        doc = r[0]
        pt_name = r[1]
        full_name = (
            f"{r[3]} {r[2]}".strip()
            if (r[2] or r[3])
            else None
        )
        out.append(
            {
                "id": doc.id,
                "kind": doc.kind,
                "practice_type_id": doc.practice_type_id,
                "practice_type_name": pt_name,
                "course": doc.course,
                "education_form": doc.education_form,
                "direction_id": doc.direction_id,
                "title": doc.title,
                "description": doc.description,
                "file_attachment": doc.file_attachment,
                "created_by_id": doc.created_by_id,
                "created_by_name": full_name,
                "created_at": doc.created_at,
                "updated_at": doc.updated_at,
            }
        )
    return out


async def get_document(db: AsyncSession, doc_id: UUID) -> dict[str, Any]:
    docs = await list_documents(db)
    for d in docs:
        if d["id"] == doc_id:
            return d
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Hujjat topilmadi")


async def create_document(
    db: AsyncSession, data: BaseModel, created_by_id: UUID
) -> dict[str, Any]:
    payload = data.model_dump(exclude_unset=True)

    # Validation: program kind requires practice_type_id
    if payload.get("kind") == DocumentKind.PROGRAM.value and not payload.get(
        "practice_type_id"
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Amaliyot dasturi uchun amaliyot turi tanlash shart",
        )

    doc = Document(
        kind=payload["kind"],
        practice_type_id=payload.get("practice_type_id"),
        course=payload.get("course"),
        education_form=payload.get("education_form"),
        direction_id=payload.get("direction_id"),
        title=payload["title"],
        description=payload.get("description"),
        file_attachment=payload["file_attachment"],
        created_by_id=created_by_id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return await get_document(db, doc.id)


async def update_document(
    db: AsyncSession, doc_id: UUID, data: BaseModel
) -> dict[str, Any]:
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hujjat topilmadi")
    payload = data.model_dump(exclude_unset=True)
    for k, v in payload.items():
        setattr(doc, k, v)
    await db.commit()
    return await get_document(db, doc_id)


async def delete_document(db: AsyncSession, doc_id: UUID) -> None:
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hujjat topilmadi")
    await db.delete(doc)
    await db.commit()
