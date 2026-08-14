"""Contracts endpoints + public verify."""

from datetime import date
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import CurrentUser, RequireAdmin
from app.db.session import SessionDep
from app.models.enums import ContractStatus
from app.schemas.common import Paginated
from app.schemas.contract import (
    ContractCreate,
    ContractRead,
    ContractRevoke,
    ContractUpdate,
    ContractVerifyResponse,
)
from app.services import contract as svc

router = APIRouter(prefix="/contracts", tags=["contracts"])

ALLOWED_SCAN_MIME = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/octet-stream",
}
MAX_SCAN_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("", response_model=Paginated[ContractRead])
async def list_contracts(
    db: SessionDep,
    _: RequireAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    organization_id: UUID | None = None,
    practice_type_id: UUID | None = None,
    academic_year_id: UUID | None = None,
    status_filter: list[ContractStatus] | None = Query(None, alias="status"),
    search: str | None = Query(None, min_length=1, max_length=100),
) -> Paginated[ContractRead]:
    offset = (page - 1) * page_size
    items, total = await svc.list_contracts(
        db,
        offset,
        page_size,
        organization_id=organization_id,
        practice_type_id=practice_type_id,
        academic_year_id=academic_year_id,
        status_filter=status_filter,
        search=search,
    )
    return Paginated(
        items=[ContractRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{id_}", response_model=ContractRead)
async def get_contract(id_: UUID, db: SessionDep, _: RequireAdmin) -> ContractRead:
    return ContractRead.model_validate(await svc.get_contract(db, id_))


@router.post("", response_model=ContractRead, status_code=status.HTTP_201_CREATED)
async def create_contract(data: ContractCreate, db: SessionDep, user: CurrentUser) -> ContractRead:
    return ContractRead.model_validate(await svc.create_contract(db, data, user.id))


@router.patch("/{id_}", response_model=ContractRead)
async def update_contract(
    id_: UUID, data: ContractUpdate, db: SessionDep, _: RequireAdmin
) -> ContractRead:
    return ContractRead.model_validate(await svc.update_contract(db, id_, data))


@router.post("/{id_}/generate", response_model=ContractRead)
async def generate_pdf(id_: UUID, db: SessionDep, _: RequireAdmin) -> ContractRead:
    """PDF + QR generatsiya. Status DRAFT → GENERATED."""
    return ContractRead.model_validate(await svc.generate_pdf(db, id_))


@router.get("/{id_}/pdf")
async def download_pdf(id_: UUID, db: SessionDep, _: RequireAdmin) -> FileResponse:
    """Saqlangan PDF faylini yuklab olish."""
    contract = await svc.get_contract(db, id_)
    if not contract["pdf_path"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PDF hali generatsiya qilinmagan")
    from app.services.pdf import STORAGE_DIR

    abs_path = STORAGE_DIR.parent.parent / contract["pdf_path"]
    if not abs_path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PDF fayli topilmadi")
    return FileResponse(
        abs_path,
        media_type="application/pdf",
        filename=f"{contract['number']}.pdf",
    )


@router.post("/{id_}/upload-scan", response_model=ContractRead)
async def upload_scan(
    id_: UUID,
    db: SessionDep,
    _: RequireAdmin,
    file: UploadFile = File(...),  # noqa: B008
) -> ContractRead:
    """Imzolangan skan yuklash. Status GENERATED → ACTIVE."""
    if file.content_type and file.content_type not in ALLOWED_SCAN_MIME:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Qo'llab-quvvatlanmaydigan format: {file.content_type}",
        )
    content = await file.read()
    if len(content) > MAX_SCAN_SIZE:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Fayl juda katta (max {MAX_SCAN_SIZE // 1024 // 1024} MB)",
        )
    return ContractRead.model_validate(
        await svc.upload_scan(db, id_, content, file.filename or "scan.pdf")
    )


@router.get("/{id_}/scan")
async def download_scan(id_: UUID, db: SessionDep, _: RequireAdmin) -> FileResponse:
    contract = await svc.get_contract(db, id_)
    if not contract["scan_path"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Skan yuklanmagan")
    from app.services.pdf import STORAGE_DIR

    abs_path = STORAGE_DIR.parent.parent / contract["scan_path"]
    if not abs_path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Skan fayli topilmadi")

    ext = Path(contract["scan_path"]).suffix
    media = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }.get(ext, "application/octet-stream")
    return FileResponse(abs_path, media_type=media, filename=f"{contract['number']}{ext}")


@router.post("/{id_}/revoke", response_model=ContractRead)
async def revoke_contract(
    id_: UUID, data: ContractRevoke, db: SessionDep, _: RequireAdmin
) -> ContractRead:
    return ContractRead.model_validate(await svc.revoke_contract(db, id_, data))


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contract(id_: UUID, db: SessionDep, _: RequireAdmin) -> None:
    await svc.delete_contract(db, id_)


# ─── Public verification (NO AUTH) ────────────────────────

public_router = APIRouter(tags=["public"])


@public_router.get("/verify/{qr_token}", response_model=ContractVerifyResponse)
async def verify_contract(qr_token: str, db: SessionDep) -> ContractVerifyResponse:
    """QR kod bosilganda ochiluvchi public endpoint — parol talab qilmaydi."""
    pdf_url = f"/api/v1/verify/{qr_token}/pdf"
    try:
        data = await svc.verify_by_token(db, qr_token)

        today = date.today()
        status_ = data["status"]
        is_valid = (
            status_ == ContractStatus.ACTIVE
            and data["end_date"] >= today
            and data["revoked_at"] is None
        )

        if status_ == ContractStatus.ACTIVE and data["end_date"] < today:
            status_ = ContractStatus.EXPIRED

        return ContractVerifyResponse(
            number=data["number"],
            template_ref=data["template_ref"],
            status=status_,
            organization_name=data["organization_name"] or "Tashkilot",
            practice_type_name=data["practice_type_name"] or "Amaliyot",
            start_date=data["start_date"],
            end_date=data["end_date"],
            students_count=len(data["students"] or []),
            generated_at=data["generated_at"],
            signed_at_org=data["signed_at_org"],
            revoked_reason=data["revoked_reason"],
            revoked_at=data["revoked_at"],
            is_valid=is_valid,
            pdf_url=pdf_url,
        )
    except HTTPException:
        # Fallback to PracticeApplication verification
        from app.services import practice_application as pa_svc

        try:
            pa_data = await pa_svc.verify_by_token(db, qr_token)
            return ContractVerifyResponse(
                number=pa_data["number"],
                template_ref=pa_data["template_ref"],
                status=pa_data["status"],
                organization_name=pa_data["organization_name"] or "Amaliyot tashkiloti",
                practice_type_name=pa_data["practice_type_name"] or "Talaba arizasi asosida",
                start_date=pa_data["start_date"],
                end_date=pa_data["end_date"],
                students_count=pa_data["students_count"],
                generated_at=pa_data["generated_at"],
                signed_at_org=pa_data["signed_at_org"],
                revoked_reason=pa_data["revoked_reason"],
                revoked_at=pa_data["revoked_at"],
                is_valid=pa_data["is_valid"],
                pdf_url=pa_data.get("pdf_url") or pdf_url,
            )
        except HTTPException as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Shartnoma topilmadi") from e


@public_router.get("/verify/{qr_token}/pdf")
async def get_verified_contract_pdf(qr_token: str, db: SessionDep) -> FileResponse:
    """QR kod orqali generatsiya qilingan rasmiy PDF hujjatni to'g'ridan-to'g'ri ko'rish yoki yuklab olish."""
    from app.services import practice_application as pa_svc

    try:
        file_path, filename = await pa_svc.get_public_contract_pdf_path(db, qr_token)
        return FileResponse(
            path=str(file_path),
            media_type="application/pdf",
            filename=f"{filename}.pdf" if not filename.endswith(".pdf") else filename,
            content_disposition_type="inline",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hujjat PDF fayli topilmadi") from e


