"""ContractTemplateDoc (DOCX shartnoma shabloni) schemalari."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ContractTemplateDocRead(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    practice_type_id: UUID | None = None
    file_attachment: dict[str, Any]
    placeholders: list[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ContractTemplateDocUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    practice_type_id: UUID | None = None
    is_active: bool | None = None
