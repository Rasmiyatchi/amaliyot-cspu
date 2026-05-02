"""Admin (admin va super_admin foydalanuvchilar) schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import UserRole


class AdminCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=4, max_length=128)
    email: str | None = None
    phone: str | None = Field(None, max_length=32)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    role: UserRole = Field(UserRole.ADMIN, description="admin yoki super_admin")


class AdminUpdate(BaseModel):
    email: str | None = None
    phone: str | None = Field(None, max_length=32)
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    role: UserRole | None = None
    is_active: bool | None = None


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

    model_config = ConfigDict(from_attributes=True)
