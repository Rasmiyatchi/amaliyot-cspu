"""HEMIS import schemalari."""

from pydantic import BaseModel


class HemisImportError(BaseModel):
    row: int
    amaliyot_id: str | None = None
    message: str


class HemisCredentials(BaseModel):
    amaliyot_id: str  # tizimdagi talaba identifikatori (eski "HEMIS id" o'rniga)
    full_name: str
    group_name: str | None = None
    course: int | None = None
    direction_code: str | None = None  # mutaxassislik kodi
    username: str  # login
    password: str  # plaintext — faqat javobda bir marta


class HemisImportResponse(BaseModel):
    total_rows: int
    created: int
    skipped: int  # allaqachon mavjud
    errors: list[HemisImportError]
    credentials: list[HemisCredentials]


class HemisCredentialsExportRequest(BaseModel):
    """Login/parol jadvalini Excel'ga eksport qilish uchun (import javobidan)."""

    credentials: list[HemisCredentials]
