"""Uploads service — fayl saqlash + JSONB attachments boshqaruvi.

Faylar `apps/api/storage/uploads/` ostiga saqlanadi:
  uploads/{YYYY}/{MM}/{ulid_random}.{ext}

Validatsiya:
- size <= system_settings.max_file_size_mb * 1024 * 1024
- ext in system_settings.allowed_file_types

Attachment metadata (JSONB ichidagi obyekt):
  {
    "id": "ulid",
    "name": "Original.pdf",
    "path": "uploads/2026/05/abc123.pdf",
    "mime": "application/pdf",
    "size": 1234567,
    "uploaded_at": "ISO datetime",
    "uploaded_by_id": "uuid",
  }
"""

from __future__ import annotations

import secrets
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_settings import SystemSettings
from app.models.task import JournalEntry, LessonAnalysis, Task
from app.models.user import User
from app.services import system_settings as settings_svc

STORAGE_ROOT = Path(__file__).parent.parent.parent / "storage" / "uploads"


def _safe_extension(filename: str) -> str:
    ext = Path(filename or "").suffix.lstrip(".").lower()
    return "".join(c for c in ext if c.isalnum())[:8]


def _generate_filename(original: str) -> str:
    ext = _safe_extension(original)
    rand = secrets.token_urlsafe(12).replace("-", "").replace("_", "")[:16]
    return f"{rand}.{ext}" if ext else rand


async def _validate_file(
    db: AsyncSession, file: UploadFile, content: bytes
) -> tuple[int, str]:
    settings: SystemSettings = await settings_svc.ensure_settings(db)
    max_bytes = (settings.max_file_size_mb or 10) * 1024 * 1024
    size = len(content)
    if size > max_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Fayl hajmi maksimaldan oshdi ({size // 1024} KB > {settings.max_file_size_mb} MB)",
        )

    ext = _safe_extension(file.filename or "")
    allowed = {e.lower() for e in (settings.allowed_file_types or [])}
    if allowed and ext not in allowed:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Ruxsat etilmagan fayl turi: .{ext or '?'}. Ruxsat etilgan: {sorted(allowed)}",
        )

    return size, ext


async def save_file(
    db: AsyncSession, file: UploadFile, user: User
) -> dict[str, Any]:
    """Faylni diskka saqlaydi va metadata qaytaradi."""
    content = await file.read()
    size, _ext = await _validate_file(db, file, content)

    now = datetime.now(UTC)
    rel_dir = Path("uploads") / f"{now.year:04d}" / f"{now.month:02d}"
    abs_dir = STORAGE_ROOT.parent / rel_dir
    abs_dir.mkdir(parents=True, exist_ok=True)

    filename = _generate_filename(file.filename or "file")
    abs_path = abs_dir / filename
    abs_path.write_bytes(content)

    rel_path = str(rel_dir / filename)

    return {
        "id": secrets.token_urlsafe(12),
        "name": file.filename or filename,
        "path": rel_path,
        "mime": file.content_type or "application/octet-stream",
        "size": size,
        "uploaded_at": now.isoformat(),
        "uploaded_by_id": str(user.id),
    }


def absolute_path(rel_path: str) -> Path:
    """Storage ichidagi nisbiy yo'lni absolute yo'lga aylantiradi.

    Path traversal'dan himoya qilamiz — natija STORAGE_ROOT.parent ichida bo'lishi shart.
    """
    base = STORAGE_ROOT.parent.resolve()
    candidate = (base / rel_path).resolve()
    try:
        candidate.relative_to(base)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Noto'g'ri yo'l") from e
    return candidate


# ─── Entity attachment management ────────────────────────


def _entity_model(kind: str) -> type[Task] | type[JournalEntry] | type[LessonAnalysis]:
    mapping = {
        "task": Task,
        "journal": JournalEntry,
        "analysis": LessonAnalysis,
    }
    if kind not in mapping:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Noto'g'ri turi: {kind}")
    return mapping[kind]


async def list_all_for_assignment(
    db: AsyncSession, assignment_id: UUID
) -> list[dict[str, Any]]:
    """Assignment bo'yicha barcha attachments — task/journal/analysis dan yig'iladi."""
    from sqlalchemy import select

    result: list[dict[str, Any]] = []

    task_rows = (
        await db.execute(
            select(Task.id, Task.attachments).where(Task.assignment_id == assignment_id)
        )
    ).all()
    for tid, attachments in task_rows:
        for att in attachments or []:
            result.append({**att, "source": "task", "source_id": str(tid)})

    journal_rows = (
        await db.execute(
            select(JournalEntry.id, JournalEntry.attachments).where(
                JournalEntry.assignment_id == assignment_id
            )
        )
    ).all()
    for jid, attachments in journal_rows:
        for att in attachments or []:
            result.append({**att, "source": "journal", "source_id": str(jid)})

    analysis_rows = (
        await db.execute(
            select(LessonAnalysis.id, LessonAnalysis.attachments).where(
                LessonAnalysis.assignment_id == assignment_id
            )
        )
    ).all()
    for aid, attachments in analysis_rows:
        for att in attachments or []:
            result.append({**att, "source": "analysis", "source_id": str(aid)})

    result.sort(key=lambda a: a.get("uploaded_at", ""), reverse=True)
    return result


async def attach_to_entity(
    db: AsyncSession,
    kind: str,
    entity_id: UUID,
    attachment: dict[str, Any],
) -> list[dict[str, Any]]:
    Model = _entity_model(kind)
    entity = await db.get(Model, entity_id)
    if not entity:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Yozuv topilmadi")
    current = list(entity.attachments or [])
    current.append(attachment)
    entity.attachments = current
    await db.commit()
    return current


async def detach_from_entity(
    db: AsyncSession,
    kind: str,
    entity_id: UUID,
    attachment_id: str,
) -> list[dict[str, Any]]:
    Model = _entity_model(kind)
    entity = await db.get(Model, entity_id)
    if not entity:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Yozuv topilmadi")
    current = list(entity.attachments or [])
    removed = next((a for a in current if a.get("id") == attachment_id), None)
    if not removed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Biriktirma topilmadi")

    current = [a for a in current if a.get("id") != attachment_id]
    entity.attachments = current
    await db.commit()

    # Faylni diskdan ham o'chiramiz (best effort)
    try:
        path = absolute_path(removed.get("path", ""))
        if path.exists():
            path.unlink()
    except Exception:  # noqa: BLE001
        pass

    return current
