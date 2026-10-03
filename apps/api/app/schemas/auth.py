"""Auth Pydantic schemas — request/response DTO'lar."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import UserRole


class DeviceInfo(BaseModel):
    """Brauzer yuboradigan qurilma ma'lumoti (navigator.userAgentData + ekran + vaqt zonasi).

    Hammasi ixtiyoriy — server User-Agent'ni ham o'zi tahlil qiladi va ikkisini birlashtiradi.
    """

    model_config = ConfigDict(extra="ignore")

    platform: str | None = Field(None, max_length=64)
    platform_version: str | None = Field(None, max_length=64)
    model: str | None = Field(None, max_length=128)
    brand: str | None = Field(None, max_length=64)
    browser: str | None = Field(None, max_length=64)
    browser_version: str | None = Field(None, max_length=64)
    screen: str | None = Field(None, max_length=64)
    timezone: str | None = Field(None, max_length=64)
    language: str | None = Field(None, max_length=32)
    touch: bool | None = None
    user_agent: str | None = Field(None, max_length=512)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=4, max_length=128)
    device_id: str | None = Field(None, max_length=128, description="Qurilma fingerprint'i")
    device_info: DeviceInfo | None = Field(None, description="Qurilma haqida ma'lumot")

    @field_validator("username")
    @classmethod
    def _strip_username(cls, v: str) -> str:
        return v.strip()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105  # OAuth2 token_type, parol emas
    expires_in: int  # sekund
    must_change_password: bool = False


class UserMeResponse(BaseModel):
    id: UUID
    username: str
    # str (EmailStr emas): bazadagi eski noto'g'ri email kirishni butunlay to'sib qo'ymasin
    email: str | None
    role: UserRole
    first_name: str
    last_name: str
    middle_name: str | None
    full_name: str
    avatar_url: str | None
    phone: str | None = None
    is_active: bool
    last_login_at: datetime | None
    must_change_password: bool = False
    faculty_id: UUID | None = None
    permissions: list[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=6, max_length=128)


class ForceChangePasswordRequest(BaseModel):
    """must_change_password=True bo'lgan foydalanuvchi uchun parolni almashtirish.

    Joriy parolni tekshirmaydi (chunki bu avto-generatsiyalangan login=parol).
    """

    new_password: str = Field(..., min_length=6, max_length=128)


class ProfileUpdateRequest(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=32)
