"""Organization schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import OrganizationKind


class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    legal_name: str | None = Field(None, max_length=300)
    kind: OrganizationKind

    director_full_name: str = Field(..., min_length=3, max_length=200)
    director_position: str | None = Field(None, max_length=100)

    region: str = Field(..., min_length=2, max_length=64)
    district: str | None = Field(None, max_length=64)
    address_line: str = Field(..., min_length=3, max_length=300)

    phone: str = Field(..., min_length=5, max_length=32)
    email: EmailStr | None = None
    website: str | None = Field(None, max_length=255)
    fax: str | None = Field(None, max_length=32)

    inn: str | None = Field(None, max_length=16)
    bank_name: str | None = Field(None, max_length=200)
    bank_account: str | None = Field(None, max_length=32)
    bank_correspondent: str | None = Field(None, max_length=32)
    bank_mfo: str | None = Field(None, max_length=16)

    capacity: int = Field(10, ge=1, le=1000)
    work_days: list[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5])
    work_hours: dict[str, Any] = Field(default_factory=lambda: {"start": "08:00", "end": "15:00"})

    geo_lat: Decimal | None = Field(None, ge=-90, le=90)
    geo_lng: Decimal | None = Field(None, ge=-180, le=180)
    geo_radius_m: int = Field(100, ge=10, le=10000)
    wifi_ssids: list[str] = Field(default_factory=list)

    notes: str | None = None
    is_active: bool = True


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=200)
    legal_name: str | None = Field(None, max_length=300)
    kind: OrganizationKind | None = None
    director_full_name: str | None = Field(None, min_length=3, max_length=200)
    director_position: str | None = Field(None, max_length=100)
    region: str | None = Field(None, min_length=2, max_length=64)
    district: str | None = Field(None, max_length=64)
    address_line: str | None = Field(None, min_length=3, max_length=300)
    phone: str | None = Field(None, min_length=5, max_length=32)
    email: EmailStr | None = None
    website: str | None = Field(None, max_length=255)
    fax: str | None = Field(None, max_length=32)
    inn: str | None = Field(None, max_length=16)
    bank_name: str | None = Field(None, max_length=200)
    bank_account: str | None = Field(None, max_length=32)
    bank_correspondent: str | None = Field(None, max_length=32)
    bank_mfo: str | None = Field(None, max_length=16)
    capacity: int | None = Field(None, ge=1, le=1000)
    work_days: list[int] | None = None
    work_hours: dict[str, Any] | None = None
    geo_lat: Decimal | None = Field(None, ge=-90, le=90)
    geo_lng: Decimal | None = Field(None, ge=-180, le=180)
    geo_radius_m: int | None = Field(None, ge=10, le=10000)
    wifi_ssids: list[str] | None = None
    notes: str | None = None
    is_active: bool | None = None


class OrganizationRead(OrganizationBase):
    id: UUID
    assigned_students_count: int = 0
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
