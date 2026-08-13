"""Talaba amaliyot arizalari (PracticeApplication) endpointlari."""

from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
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


@router.get("/{id_}/preview-pdf")
async def preview_contract_pdf(id_: UUID, db: SessionDep, _: RequireAdmin):
    """Shartnomani tasdiqlashdan oldin PDF ko'rinishda ko'rish (saqlashsiz)."""
    from fastapi.responses import Response

    try:
        pdf_bytes = await svc.preview_contract_pdf(db, id_)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "inline; filename=preview.pdf"},
        )
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Preview xatosi: {e}") from e


@router.get("/{id_}/contract.docx")
async def download_contract(id_: UUID, db: SessionDep, user: CurrentUser) -> FileResponse:
    path, number = await svc.contract_file_path(db, user, id_)
    # If the file is actually a PDF (it ends with .pdf), return it as PDF
    ext = path.suffix.lower()
    if ext == ".pdf":
        return FileResponse(
            path, media_type="application/pdf", filename=f"{number or 'shartnoma'}.pdf"
        )
    return FileResponse(path, media_type=_DOCX_MIME, filename=f"{number or 'shartnoma'}.docx")


@router.get("/{id_}/contract.pdf")
async def download_contract_pdf(id_: UUID, db: SessionDep, user: CurrentUser) -> FileResponse:
    """PDF sifatida yuklab olish (frontend /contract.pdf ga murojaat qiladi)."""
    path, number = await svc.contract_file_path(db, user, id_)
    ext = path.suffix.lower()
    if ext == ".pdf":
        return FileResponse(
            path, media_type="application/pdf", filename=f"{number or 'shartnoma'}.pdf"
        )
    return FileResponse(path, media_type=_DOCX_MIME, filename=f"{number or 'shartnoma'}.docx")



@router.post("/{id_}/upload-scan", response_model=ApplicationRead)
async def upload_scan(
    id_: UUID, db: SessionDep, user: CurrentUser, file: UploadFile = File(...)
) -> ApplicationRead:
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        from fastapi import HTTPException

        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Fayl hajmi katta")
    return ApplicationRead.model_validate(
        await svc.upload_scan(db, id_, user, content, file.filename or "scan.pdf")
    )


@router.get("/{id_}/scan")
async def download_scan(id_: UUID, db: SessionDep, user: CurrentUser) -> FileResponse:
    # Service doesn't have download_scan yet, let's just do it here
    from fastapi import HTTPException

    app_obj = await svc._get_obj(db, id_)
    if user.role not in ("admin", "super_admin"):
        student = await svc._student_for_user(db, user)
        if app_obj.student_id != student.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ruxsat yo'q")

    if not app_obj.scan_file:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Skan yuklanmagan")

    from app.services.pdf import STORAGE_DIR as PDF_STORAGE_DIR

    abs_path = PDF_STORAGE_DIR.parent.parent / app_obj.scan_file["path"]
    if not abs_path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Fayl topilmadi")

    return FileResponse(
        abs_path, media_type=app_obj.scan_file["mime"], filename=app_obj.scan_file["name"]
    )


# ─── Admin ────────────────────────────────────────────────


@router.get("/approved-contracts", response_model=list[ApplicationRead])
async def list_approved_contracts(
    db: SessionDep,
    _: RequireAdmin,
    search: str | None = Query(None, min_length=1, max_length=100),
) -> list[ApplicationRead]:
    """Tasdiqlangan va shartnoma fayli mavjud arizalar — admin 'Shartnomalar' bo'limi uchun."""
    rows = await svc.list_all(
        db,
        status_filter=ApplicationStatus.APPROVED,
        search=search,
    )
    # Faqat shartnoma fayli bor arizalar
    rows = [r for r in rows if r.get("contract_file")]
    return [ApplicationRead.model_validate(r) for r in rows]


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


@router.post("/{id_}/return", response_model=ApplicationRead)
async def return_application(
    id_: UUID, data: ApplicationReview, db: SessionDep, user: RequireSuperAdmin
) -> ApplicationRead:
    """Arizani kamchiliklar sababli tuzatishga qaytarish."""
    if not data.return_reason:
        from fastapi import HTTPException

        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Qaytarish sababi kiritilishi shart")
    return ApplicationRead.model_validate(
        await svc.return_application(db, id_, user, data.return_reason)
    )
