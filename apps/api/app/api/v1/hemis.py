"""HEMIS import endpoint."""

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.api.deps import RequireAdmin
from app.db.session import SessionDep
from app.schemas.hemis import HemisImportResponse
from app.services.hemis import import_students

router = APIRouter(prefix="/hemis", tags=["hemis"])

ALLOWED_MIME = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.ms-excel",  # .xls (eski)
    "application/octet-stream",  # ba'zi brauzer content-type bermaydi
}

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post(
    "/import",
    response_model=HemisImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="HEMIS Excel import",
    description=(
        "Excel'dan talabalarni bulk import qiladi. "
        "Ustunlar: hemis_id, full_name, mutaxassislik (yo'nalish kodi), guruh, kurs "
        "(majburiy); jins, viloyat, tuman, ta'lim tili/shakli/turi, semestr, bitiruvchi "
        "(ixtiyoriy). Maxfiylik: tug'ilgan sana, pasport, JSHSHIR ustunlari bo'lsa ham "
        "saqlanmaydi. Mavjud hemis_id skip qilinadi. "
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
