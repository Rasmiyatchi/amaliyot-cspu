"""Area schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AreaBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: str | None = None
    region: str = Field(..., min_length=2, max_length=64)
    district: str | None = Field(None, max_length=64)
    geo_lat: Decimal | None = Field(None, ge=-90, le=90)
    geo_lng: Decimal | None = Field(None, ge=-180, le=180)
    geo_bounds: dict[str, Any] | None = None
    capacity: int = Field(30, ge=1, le=1000)
    is_active: bool = True


class AreaCreate(AreaBase):
    pass


class AreaUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=200)
    description: str | None = None
    region: str | None = Field(None, min_length=2, max_length=64)
    district: str | None = Field(None, max_length=64)
    geo_lat: Decimal | None = Field(None, ge=-90, le=90)
    geo_lng: Decimal | None = Field(None, ge=-180, le=180)
    geo_bounds: dict[str, Any] | None = None
    capacity: int | None = Field(None, ge=1, le=1000)
    is_active: bool | None = None


class AreaRead(AreaBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
