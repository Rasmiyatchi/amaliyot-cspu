"""Admin (admin va super_admin foydalanuvchilar) schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import UserRole

# deps.require_permission bilan bir xil modul nomlari
ADMIN_PERMISSIONS: frozenset[str] = frozenset(
    {
        "structure",
        "practice",
        "contracts",
        "supervisors",
        "partners",
        "monitoring",
        "inquiries",
        "system",
    }
)


def _normalize_email(v: object) -> object:
    # Bo'sh qator → None; bo'shliqlar olib tashlanadi. Noto'g'ri email endi saqlanmaydi:
    # ilgari "dekanat@chdpu" kabi manzil saqlanib, /auth/me javobi yiqilib admin kira olmasdi.
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


def _validate_permissions(v: list[str] | None) -> list[str] | None:
    if v is None:
        return v
    unknown = sorted(set(v) - ADMIN_PERMISSIONS)
    if unknown:
        raise ValueError(f"Noma'lum ruxsat(lar): {', '.join(unknown)}")
    return sorted(set(v))


class AdminCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=6, max_length=128)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=32)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    role: UserRole = Field(UserRole.ADMIN, description="admin yoki super_admin")
    faculty_id: UUID | None = None
    permissions: list[str] = Field(default_factory=list)

    _email = field_validator("email", mode="before")(_normalize_email)
    _perms = field_validator("permissions")(_validate_permissions)

    @field_validator("username")
    @classmethod
    def _strip_username(cls, v: str) -> str:
        return v.strip()


class AdminUpdate(BaseModel):
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=32)
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    role: UserRole | None = None
    is_active: bool | None = None
    faculty_id: UUID | None = None
    permissions: list[str] | None = None

    _email = field_validator("email", mode="before")(_normalize_email)
    _perms = field_validator("permissions")(_validate_permissions)


class AdminRead(BaseModel):
    id: UUID
    username: str
    email: str | None
    phone: str | None
    first_name: str
    last_name: str
    middle_name: str | None
    full_name: str
    role: UserRole
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
    faculty_id: UUID | None = None
    faculty_name: str | None = None
    permissions: list[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
