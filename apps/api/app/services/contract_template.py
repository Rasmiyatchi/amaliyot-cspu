"""ContractTemplateDoc service — DOCX shablon yuklash, placeholder aniqlash, render.

docxtpl ({{ jinja }} sintaksisi) bilan ishlaydi. Output — to'ldirilgan .docx
(QR rasm sifatida joylashtirilishi mumkin). LibreOffice talab qilinmaydi.
"""

from __future__ import annotations

import io
import secrets
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contract_template import ContractTemplateDoc
from app.models.user import User

_STORAGE = Path(__file__).parent.parent.parent / "storage" / "contract_templates"
_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
_MAX_SIZE = 10 * 1024 * 1024


def _detect_placeholders(docx_bytes: bytes) -> list[str]:
    """DOCX ichidagi {{ maydon }} placeholder'larini aniqlaydi."""
    tpl = DocxTemplate(io.BytesIO(docx_bytes))
    return sorted(tpl.get_undeclared_template_variables())


def _save_docx(content: bytes, original: str) -> dict[str, Any]:
    now = datetime.now(UTC)
    _STORAGE.mkdir(parents=True, exist_ok=True)
    rand = secrets.token_urlsafe(12).replace("-", "").replace("_", "")[:16]
    filename = f"{rand}.docx"
    (_STORAGE / filename).write_bytes(content)
    return {
        "name": original or filename,
        "path": filename,
        "mime": _DOCX_MIME,
        "size": len(content),
        "uploaded_at": now.isoformat(),
    }


def _abs_path(rel: str) -> Path:
    """Faqat shablon nomi (path traversal'siz)."""
    candidate = (_STORAGE / Path(rel).name).resolve()
    base = _STORAGE.resolve()
    try:
        candidate.relative_to(base)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Noto'g'ri yo'l") from e
    return candidate


async def create_template(
    db: AsyncSession,
    *,
    file: UploadFile,
    name: str,
    description: str | None,
    practice_type_id: UUID | None,
    user: User,
) -> ContractTemplateDoc:
    if not (file.filename or "").lower().endswith(".docx"):
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, ".docx fayl yuklang"
        )
    content = await file.read()
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Fayl bo'sh")
    if len(content) > _MAX_SIZE:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Fayl juda katta (max {_MAX_SIZE // 1024 // 1024} MB)",
        )
    try:
        placeholders = _detect_placeholders(content)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"DOCX o'qib bo'lmadi: {e}"
        ) from e

    attachment = _save_docx(content, file.filename or "shablon.docx")
    tpl = ContractTemplateDoc(
        name=name,
        description=description,
        practice_type_id=practice_type_id,
        file_attachment=attachment,
        placeholders=placeholders,
        created_by_id=user.id,
    )
    db.add(tpl)
    await db.commit()
    await db.refresh(tpl)
    return tpl


async def list_templates(db: AsyncSession) -> list[ContractTemplateDoc]:
    return list(
        (
            await db.execute(
                select(ContractTemplateDoc).order_by(ContractTemplateDoc.created_at.desc())
            )
        )
        .scalars()
        .all()
    )


async def get_template(db: AsyncSession, id_: UUID) -> ContractTemplateDoc:
    tpl = await db.get(ContractTemplateDoc, id_)
    if not tpl:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shablon topilmadi")
    return tpl


async def update_template(db: AsyncSession, id_: UUID, data: dict[str, Any]) -> ContractTemplateDoc:
    tpl = await get_template(db, id_)
    for key, value in data.items():
        if value is not None:
            setattr(tpl, key, value)
    await db.commit()
    await db.refresh(tpl)
    return tpl


async def delete_template(db: AsyncSession, id_: UUID) -> None:
    tpl = await get_template(db, id_)
    path = (tpl.file_attachment or {}).get("path")
    await db.delete(tpl)
    await db.commit()
    if path:
        with __import__("contextlib").suppress(Exception):
            _abs_path(path).unlink(missing_ok=True)


def template_file_path(tpl: ContractTemplateDoc) -> Path:
    rel = (tpl.file_attachment or {}).get("path")
    if not rel:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shablon fayli yo'q")
    return _abs_path(rel)


def render_docx(tpl: ContractTemplateDoc, context: dict[str, Any], qr_png: bytes | None = None) -> bytes:
    """Shablonni context bilan to'ldirib, to'ldirilgan .docx baytlarini qaytaradi.

    `qr_png` berilsa va shablonda `{{ qr }}` placeholder bo'lsa — QR rasm joylashtiriladi.
    """
    doc = DocxTemplate(str(template_file_path(tpl)))
    ctx = dict(context)
    if qr_png is not None and "qr" in (tpl.placeholders or []):
        ctx["qr"] = InlineImage(doc, io.BytesIO(qr_png), width=Mm(30))
    doc.render(ctx)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()
