"""Supervisor schemas — User + profile bog'langan."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class SupervisorCreate(BaseModel):
    """Supervisor yaratish — User va profile birgalikda."""

    # User fields
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=8, max_length=128)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=32)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)

    # Supervisor profile fields
    position: str = Field(..., min_length=2, max_length=100)
    specialty: str | None = Field(None, max_length=150)
    experience_years: int | None = Field(None, ge=0, le=80)
    organization_id: UUID | None = None
    capacity: int = Field(5, ge=1, le=100)


class SupervisorUpdate(BaseModel):
    # User fields (optional)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=32)
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)

    # Supervisor profile fields
    position: str | None = Field(None, min_length=2, max_length=100)
    specialty: str | None = Field(None, max_length=150)
    experience_years: int | None = Field(None, ge=0, le=80)
    organization_id: UUID | None = None
    capacity: int | None = Field(None, ge=1, le=100)
    is_active: bool | None = None


class SupervisorRead(BaseModel):
    # Identity
    id: UUID
    user_id: UUID
    username: str

    # Profile (User)
    first_name: str
    last_name: str
    middle_name: str | None
    full_name: str
    email: EmailStr | None
    phone: str | None
    is_active: bool
    last_login_at: datetime | None

    # Supervisor
    position: str
    specialty: str | None
    experience_years: int | None
    capacity: int
    rating: Decimal
    organization_id: UUID | None
    organization_name: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
