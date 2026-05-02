"""SystemSettings schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SystemSettingsRead(BaseModel):
    id: UUID
    site_name: str
    site_description: str | None
    max_file_size_mb: int
    allowed_file_types: list[str]
    email_notifications_enabled: bool
    maintenance_mode: bool
    maintenance_message: str | None
    extra: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SystemSettingsUpdate(BaseModel):
    site_name: str | None = Field(None, min_length=1, max_length=200)
    site_description: str | None = Field(None, max_length=2000)
    max_file_size_mb: int | None = Field(None, ge=1, le=500)
    allowed_file_types: list[str] | None = Field(None, max_length=20)
    email_notifications_enabled: bool | None = None
    maintenance_mode: bool | None = None
    maintenance_message: str | None = Field(None, max_length=2000)


class SystemSettingsPublic(BaseModel):
    """Login sahifasi va public verify uchun (auth talab qilmaydi)."""

    site_name: str
    site_description: str | None
    maintenance_mode: bool
    maintenance_message: str | None
