"""Talaba amaliyot arizasi (PracticeApplication) schemalari."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.enums import ApplicationStatus, OrganizationKind

_MAX_VARIABLES = 60
_MAX_VALUE_LEN = 1000


def _bounded_values(v: dict[str, Any] | None) -> dict[str, Any] | None:
    """Talaba kiritgan shablon qiymatlari: faqat oddiy qiymatlar va cheklangan hajm
    (bir maydonga megabaytlab matn yozib PDF generatsiyasini to'xtatib bo'lmasin)."""
    if v is None:
        return v
    if len(v) > _MAX_VARIABLES:
        raise ValueError("Maydonlar soni juda ko'p")
    out: dict[str, Any] = {}
    for key, value in v.items():
        if not isinstance(key, str) or len(key) > 64:
            raise ValueError("Noto'g'ri maydon nomi")
        if value is None or isinstance(value, bool | int | float):
            out[key] = value
            continue
        text = str(value)
        if len(text) > _MAX_VALUE_LEN:
            raise ValueError(f"'{key}' maydoni juda uzun (max {_MAX_VALUE_LEN} belgi)")
        out[key] = text
    return out


class ApplicationCreate(BaseModel):
    """Talaba ariza yaratish — shablon variablelari asosida dinamik.

    contract_template_id: majburiy — qaysi shablon asosida ariza yuborilmoqda
    variable_values: talaba kiritgan dinamik fieldlar (source=student_input)

    Eski fieldlar (organization_type, organization_name) backward compat uchun saqlanmoqda.
    Yangi oqimda faqat variable_values ishlatiladi.
    """
    contract_template_id: UUID
    variable_values: dict[str, Any] | None = None

    _values = field_validator("variable_values")(_bounded_values)

    # Backward compatibility — eski oqim uchun
    organization_type: OrganizationKind | None = Field(default=None)
    organization_name: str | None = Field(None, max_length=500)
    region: str | None = Field(None, max_length=64)
    district: str | None = Field(None, max_length=64)
    note: str | None = None


class ApplicationResubmit(BaseModel):
    """Tuzatilgan arizani qayta yuborish — yangilangan maydon qiymatlari bilan."""

    variable_values: dict[str, Any] | None = None

    _values = field_validator("variable_values")(_bounded_values)


class ApplicationReview(BaseModel):
    review_note: str | None = Field(None, max_length=500)
    return_reason: str | None = Field(None, max_length=500)


class ApplicationRead(BaseModel):
    id: UUID
    student_id: UUID
    student_name: str | None = None
    direction_name: str | None = None
    group_name: str | None = None
    course: int | None = None
    contract_template_id: UUID | None = None
    contract_template_name: str | None = None
    contract_number: str | None = None
    has_contract_file: bool = False
    has_scan_file: bool = False
    contract_file: dict[str, Any] | None = None
    scan_file: dict[str, Any] | None = None

    organization_type: OrganizationKind | None = None
    organization_name: str | None = None
    region: str | None = None
    district: str | None = None
    note: str | None = None
    status: ApplicationStatus
    qr_token: str | None = None
    variable_values: dict[str, Any] | None = None
    reviewed_by_id: UUID | None = None
    reviewed_at: datetime | None = None
    review_note: str | None = None
    return_reason: str | None = None
    created_at: datetime
    updated_at: datetime
