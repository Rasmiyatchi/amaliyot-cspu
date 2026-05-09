"""Document schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import DocumentKind


class DocumentRead(BaseModel):
    id: UUID
    kind: DocumentKind
    practice_type_id: UUID | None = None
    practice_type_name: str | None = None
    title: str
    description: str | None = None
    file_attachment: dict[str, Any]
    created_by_id: UUID | None = None
    created_by_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentCreate(BaseModel):
    kind: DocumentKind
    practice_type_id: UUID | None = None
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = Field(None, max_length=10_000)
    # file_attachment dict shape: {"id","name","path","mime","size","uploaded_at","uploaded_by_id"}
    file_attachment: dict[str, Any]


class DocumentUpdate(BaseModel):
    practice_type_id: UUID | None = None
    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = Field(None, max_length=10_000)
    file_attachment: dict[str, Any] | None = None
