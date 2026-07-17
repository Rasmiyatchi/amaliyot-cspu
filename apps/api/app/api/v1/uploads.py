"""Uploads endpoints — fayl yuklash, attachment biriktirish, fayl serve qilish.

Oqim:
1. POST /uploads/entity/{kind}/{entity_id} — multipart fayl, RBAC tekshirilib
   diskka saqlanadi va entity'ning attachments JSONB ga qo'shiladi.
2. DELETE /uploads/entity/{kind}/{entity_id}/{attachment_id} — biriktirmani o'chiradi.
3. GET /uploads/file/{path:path} — auth bilan fayl beradi (download/inline).

Kind: "task" | "journal" | "analysis".
RBAC:
- Student: o'ziniki bo'lgan task/journal/analysis ga yuklashi mumkin
- Supervisor: o'ziga biriktirilgan assignmentlar ichida
- Admin / Super admin: hammasi
"""

from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi import Path as FPath
from fastapi.responses import FileResponse

from app.api.deps import CurrentUser
from app.db.session import SessionDep
from app.models.enums import UserRole
from app.models.task import JournalEntry, LessonAnalysis, Task
from app.services import uploads as svc
from app.services.task import _check_student_owns, _check_supervisor_owns

router = APIRouter(prefix="/uploads", tags=["uploads"])


async def _check_entity_access(  # type: ignore[no-untyped-def]
    db, kind: str, entity_id: UUID, user
) -> None:
    """Foydalanuvchi entity'ga ruxsati borligini tekshiradi."""
    if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        return

    if kind == "task":
        entity = await db.get(Task, entity_id)
    elif kind == "journal":
        entity = await db.get(JournalEntry, entity_id)
    elif kind == "analysis":
        entity = await db.get(LessonAnalysis, entity_id)
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Noto'g'ri turi")

    if not entity:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Yozuv topilmadi")

    if user.role == UserRole.STUDENT:
        await _check_student_owns(db, entity.assignment_id, user.id)
    elif user.role == UserRole.SUPERVISOR:
        await _check_supervisor_owns(db, entity.assignment_id, user.id)
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN)


async def _check_assignment_access(  # type: ignore[no-untyped-def]
    db, assignment_id: UUID, user
) -> None:
    """Assignment bo'yicha ko'rish ruxsati: admin — hammasi, talaba/supervizor — o'ziniki."""
    if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        return
    if user.role == UserRole.STUDENT:
        await _check_student_owns(db, assignment_id, user.id)
    elif user.role == UserRole.SUPERVISOR:
        await _check_supervisor_owns(db, assignment_id, user.id)
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN)


@router.get(
    "/assignments/{assignment_id}/all",
    summary="Assignment bo'yicha barcha hujjatlar (topshiriq + kundalik + tahlil)",
)
async def list_assignment_attachments(
    assignment_id: UUID, db: SessionDep, user: CurrentUser
) -> list[dict]:
    await _check_assignment_access(db, assignment_id, user)
    return await svc.list_all_for_assignment(db, assignment_id)


@router.post(
    "/standalone",
    summary="Mustaqil fayl yuklash (Document yoki Avatar uchun)",
)
async def upload_standalone(
    db: SessionDep,
    user: CurrentUser,
    file: UploadFile = File(...),
) -> dict:
    """Faylni saqlaydi va attachment metadata qaytaradi.

    Document yoki har qanday entity'ga keyinchalik biriktirish uchun ishlatiladi.
    """
    attachment = await svc.save_file(db, file, user)
    return {"attachment": attachment}


@router.post(
    "/entity/{kind}/{entity_id}",
    summary="Fayl yuklash va task/journal/analysis ga biriktirish",
)
async def upload_attachment(
    kind: str,
    entity_id: UUID,
    db: SessionDep,
    user: CurrentUser,
    file: UploadFile = File(...),
) -> dict:
    if kind not in {"task", "journal", "analysis"}:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "kind: task | journal | analysis"
        )
    await _check_entity_access(db, kind, entity_id, user)
    attachment = await svc.save_file(db, file, user)
    attachments = await svc.attach_to_entity(db, kind, entity_id, attachment)
    return {"attachment": attachment, "all": attachments}


@router.delete(
    "/entity/{kind}/{entity_id}/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Biriktirmani o'chirish",
)
async def delete_attachment(
    kind: str,
    entity_id: UUID,
    attachment_id: str,
    db: SessionDep,
    user: CurrentUser,
) -> None:
    if kind not in {"task", "journal", "analysis"}:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "kind: task | journal | analysis"
        )
    await _check_entity_access(db, kind, entity_id, user)
    await svc.detach_from_entity(db, kind, entity_id, attachment_id)


@router.get(
    "/file/{path:path}",
    summary="Yuklab olingan faylni qaytarish (auth talab qilinadi)",
)
async def serve_file(
    path: str = FPath(..., description="Storage'ga nisbiy yo'l"),
    user: CurrentUser = ...,  # noqa: B008
) -> FileResponse:
    abs_path = svc.absolute_path(path)
    if not abs_path.exists() or not abs_path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Fayl topilmadi")
    return FileResponse(
        path=abs_path,
        filename=Path(path).name,
        media_type="application/octet-stream",
    )
