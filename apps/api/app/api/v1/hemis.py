"""Talabalar Excel import endpoint."""

from fastapi import APIRouter, File, HTTPException, Response, UploadFile, status

from app.api.deps import RequireAdmin
from app.db.session import SessionDep
from app.schemas.hemis import HemisCredentialsExportRequest, HemisImportResponse
from app.services.hemis import import_students
from app.services.import_templates import (
    build_credentials_xlsx,
    build_students_template,
)

router = APIRouter(prefix="/hemis", tags=["hemis"])

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

ALLOWED_MIME = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.ms-excel",  # .xls (eski)
    "application/octet-stream",  # ba'zi brauzer content-type bermaydi
}

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.get(
    "/template",
    summary="Talaba import uchun namuna Excel shablonini yuklab olish",
)
async def students_template(_: RequireAdmin) -> Response:
    return Response(
        content=build_students_template(),
        media_type=_XLSX_MIME,
        headers={
            "Content-Disposition": 'attachment; filename="talabalar_import_shablon.xlsx"'
        },
    )


@router.post(
    "/credentials.xlsx",
    summary="Import qilingan talabalar login/parolini Excel'ga eksport qilish",
)
async def export_credentials(
    payload: HemisCredentialsExportRequest, _: RequireAdmin
) -> Response:
    return Response(
        content=build_credentials_xlsx(payload.credentials),
        media_type=_XLSX_MIME,
        headers={
            "Content-Disposition": 'attachment; filename="talabalar_login_parol.xlsx"'
        },
    )


@router.post(
    "/import",
    response_model=HemisImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Talabalar Excel import",
    description=(
        "Excel'dan talabalarni bulk import qiladi. "
        "Majburiy ustunlar: To'liq ismi, Mutaxassislik (yo'nalish kodi), Guruh, Kurs. "
        "Ixtiyoriy: Viloyat, Tuman, Jins, Ta'lim tili, O'quv yili, Semestr, Bitiruvchi, "
        "Ta'lim shakli. Amaliyot ID ixtiyoriy — berilmasa tizim avtomatik generatsiya qiladi. "
        "Maxfiylik: tug'ilgan sana, pasport, JSHSHIR saqlanmaydi. "
        "Har yangi talabaga login/parol avtomatik generatsiya qilinadi va javobda qaytariladi."
    ),
)
async def hemis_import(
    db: SessionDep,
    _: RequireAdmin,
    file: UploadFile = File(...),  # noqa: B008
) -> HemisImportResponse:
    if file.content_type and file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Qo'llab-quvvatlanmaydigan format: {file.content_type}. .xlsx fayl yuklang.",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Fayl juda katta (max {MAX_FILE_SIZE // 1024 // 1024} MB)",
        )
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Fayl bo'sh")

    return await import_students(db, content)
