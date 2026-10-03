"""Contracts endpoints + public verify."""

from datetime import date
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import CurrentUser, RequireContracts
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
    # ba'zi telefonlar PDF'ni shunday yuboradi — quyida magic-byte tekshiriladi
    "application/octet-stream",
}
_SCAN_MAGIC = (b"%PDF-", b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n")
MAX_SCAN_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("", response_model=Paginated[ContractRead])
async def list_contracts(
    db: SessionDep,
    _: RequireContracts,
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
async def get_contract(id_: UUID, db: SessionDep, _: RequireContracts) -> ContractRead:
    return ContractRead.model_validate(await svc.get_contract(db, id_))


@router.post("", response_model=ContractRead, status_code=status.HTTP_201_CREATED)
async def create_contract(
    data: ContractCreate, request: Request, db: SessionDep, user: RequireContracts
) -> ContractRead:
    from app.services import audit_log as audit

    result = await svc.create_contract(db, data, user.id)
    await audit.log(
        db,
        actor=user,
        action="create",
        entity_type="contract",
        entity_id=result["id"],
        summary=f"Shartnoma yaratildi: {result.get('number')}",
        metadata={"students": len(result.get("students") or [])},
        request=request,
    )
    await db.commit()
    return ContractRead.model_validate(result)


@router.patch("/{id_}", response_model=ContractRead)
async def update_contract(
    id_: UUID, data: ContractUpdate, db: SessionDep, _: RequireContracts
) -> ContractRead:
    return ContractRead.model_validate(await svc.update_contract(db, id_, data))


@router.post("/{id_}/generate", response_model=ContractRead)
async def generate_pdf(id_: UUID, db: SessionDep, _: RequireContracts) -> ContractRead:
    """PDF + QR generatsiya. Status DRAFT → GENERATED."""
    return ContractRead.model_validate(await svc.generate_pdf(db, id_))


async def _check_contract_access(db: SessionDep, contract_id: UUID, user: CurrentUser) -> None:
    """Admin — hammasi; talaba — faqat o'zi kiritilgan shartnoma (students snapshot orqali)."""
    from sqlalchemy import select

    from app.models.contract import Contract
    from app.models.enums import UserRole
    from app.models.practice_assignment import PracticeAssignment
    from app.models.student import Student

    if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        return
    if user.role == UserRole.STUDENT:
        student_id = (
            await db.execute(select(Student.id).where(Student.user_id == user.id))
        ).scalar_one_or_none()
        snapshot = (
            await db.execute(select(Contract.students).where(Contract.id == contract_id))
        ).scalar_one_or_none()
        assignment_ids: list[UUID] = []
        for item in snapshot or []:
            raw = item.get("assignment_id") if isinstance(item, dict) else None
            try:
                if raw:
                    assignment_ids.append(UUID(str(raw)))
            except ValueError:
                continue
        if student_id and assignment_ids:
            owned = (
                await db.execute(
                    select(PracticeAssignment.id)
                    .where(
                        PracticeAssignment.id.in_(assignment_ids),
                        PracticeAssignment.student_id == student_id,
                    )
                    .limit(1)
                )
            ).scalar_one_or_none()
            if owned:
                return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q")


def _find_contract_file(rel_path: str | None) -> Path | None:
    """Saqlangan nisbiy yo'ldan faylni topadi (faqat storage/ ichida)."""
    if not rel_path:
        return None
    base = Path(__file__).resolve().parent.parent.parent.parent  # apps/api
    storage = (base / "storage").resolve()
    clean_rel = str(rel_path).replace("\\", "/").lstrip("/")
    candidates = (
        base / clean_rel,
        base / "storage" / clean_rel,
        base / "storage" / "contracts" / clean_rel,
    )
    for cand in candidates:
        try:
            resolved = cand.resolve()
        except OSError:
            continue
        if str(resolved).startswith(str(storage)) and resolved.is_file():
            return resolved
    return None


@router.get("/{id_}/pdf")
async def download_pdf(id_: UUID, db: SessionDep, user: CurrentUser) -> FileResponse:
    """Saqlangan PDF faylini yuklab olish yoki ko'rish.

    Fayl yo'q bo'lsa faqat admin uchun va faqat DRAFT/GENERATED holatda qayta yaratiladi;
    imzolangan/bekor qilingan shartnoma hech qachon qayta generatsiya qilinmaydi.
    """
    from app.models.enums import UserRole

    await _check_contract_access(db, id_, user)
    contract = await svc.get_contract(db, id_)
    abs_path = _find_contract_file(contract["pdf_path"])

    can_regenerate = user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN) and contract["status"] in (
        ContractStatus.DRAFT,
        ContractStatus.GENERATED,
    )
    if abs_path is None and can_regenerate:
        contract = await svc.generate_pdf(db, id_)
        abs_path = _find_contract_file(contract["pdf_path"])

    if abs_path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PDF fayli topilmadi")

    return FileResponse(
        path=str(abs_path),
        media_type="application/pdf",
        filename=f"{contract['number']}.pdf",
        content_disposition_type="inline",
    )


@router.post("/{id_}/upload-scan", response_model=ContractRead)
async def upload_scan(
    id_: UUID,
    db: SessionDep,
    _: RequireContracts,
    file: UploadFile = File(...),  # noqa: B008
) -> ContractRead:
    """Imzolangan skan yuklash. Status GENERATED → ACTIVE."""
    if file.content_type and file.content_type not in ALLOWED_SCAN_MIME:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Qo'llab-quvvatlanmaydigan format: {file.content_type}",
        )
    content = await file.read()
    if not content.startswith(_SCAN_MAGIC):
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Fayl PDF, JPG yoki PNG emas",
        )
    if len(content) > MAX_SCAN_SIZE:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Fayl juda katta (max {MAX_SCAN_SIZE // 1024 // 1024} MB)",
        )
    return ContractRead.model_validate(
        await svc.upload_scan(db, id_, content, file.filename or "scan.pdf")
    )


@router.get("/{id_}/scan")
async def download_scan(id_: UUID, db: SessionDep, user: CurrentUser) -> FileResponse:
    await _check_contract_access(db, id_, user)
    contract = await svc.get_contract(db, id_)
    if not contract["scan_path"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Skan yuklanmagan")
    abs_path = _find_contract_file(contract["scan_path"])
    if not abs_path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Skan fayli topilmadi")

    ext = abs_path.suffix.lower()
    media = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }.get(ext, "application/octet-stream")
    return FileResponse(
        path=str(abs_path),
        media_type=media,
        filename=f"{contract['number']}_scan{ext}",
        content_disposition_type="inline",
    )


@router.post("/{id_}/revoke", response_model=ContractRead)
async def revoke_contract(
    id_: UUID, data: ContractRevoke, db: SessionDep, _: RequireContracts
) -> ContractRead:
    return ContractRead.model_validate(await svc.revoke_contract(db, id_, data))


@router.post("/{id_}/archive", response_model=ContractRead)
async def archive_contract(
    id_: UUID, db: SessionDep, _: RequireContracts
) -> ContractRead:
    """Shartnomani arxivga o'tkazish (status -> EXPIRED)."""
    return ContractRead.model_validate(await svc.archive_contract(db, id_))


@router.post("/{id_}/unarchive", response_model=ContractRead)
async def unarchive_contract(
    id_: UUID, db: SessionDep, _: RequireContracts
) -> ContractRead:
    """Shartnomani arxivdan chiqarish (status -> ACTIVE/GENERATED/DRAFT)."""
    return ContractRead.model_validate(await svc.unarchive_contract(db, id_))


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contract(id_: UUID, db: SessionDep, _: RequireContracts) -> None:
    await svc.delete_contract(db, id_)


# ─── Public verification (NO AUTH) ────────────────────────

public_router = APIRouter(tags=["public"])


@public_router.get("/verify/{qr_token}", response_model=ContractVerifyResponse)
async def verify_contract(qr_token: str, db: SessionDep) -> ContractVerifyResponse:
    """QR kod bosilganda ochiluvchi public endpoint — parol talab qilmaydi."""
    pdf_url = f"/api/v1/verify/{qr_token}/pdf"
    try:
        data = await svc.verify_by_token(db, qr_token)

        status_ = data["status"]

        # Shartnoma bekor qilingan (revoked) bo'lsa yoki revoked_at bo'lsa yaroqsiz (is_valid = False).
        # Barcha imzolangan/faol shartnomalar rasmiy va yaroqli (is_valid = True).
        is_revoked = status_ == ContractStatus.REVOKED or data.get("revoked_at") is not None
        is_valid = not is_revoked

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
            is_expired=data["end_date"] < date.today(),
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


