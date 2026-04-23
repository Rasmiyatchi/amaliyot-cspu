"""Auth Pydantic schemas — request/response DTO'lar."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import UserRole


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105  # OAuth2 token_type, parol emas
    expires_in: int  # sekund


class UserMeResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr | None
    role: UserRole
    first_name: str
    last_name: str
    middle_name: str | None
    full_name: str
    avatar_url: str | None
    is_active: bool
    last_login_at: datetime | None

    model_config = {"from_attributes": True}


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)
