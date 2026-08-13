"""ContractTemplateDoc (DOCX shartnoma shabloni) schemalari."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ContractTemplateStatus


class TemplateVariable(BaseModel):
    """Shablon o'zgaruvchisi metadata — Admin tomonidan belgilanadi."""

    key: str = Field(..., min_length=1, max_length=100)
    label: str = Field(..., min_length=1, max_length=200)
    type: str = Field(default="text")  # text, number, date, select, textarea
    required: bool = True
    source: str = Field(default="student_input")  # "system" yoki "student_input"
    options: list[str] | None = None  # type=select uchun variantlar
    placeholder: str | None = None
    defaultValue: str | None = None  # noqa: N815 — frontend camelCase kutadi


class ContractTemplateDocRead(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    practice_type_id: UUID | None = None
    file_attachment: dict[str, Any] | None = None
    html_content: str | None = None
    placeholders: list[str]
    variables: list[dict[str, Any]] = []
    status: ContractTemplateStatus
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ContractTemplateDocUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    practice_type_id: UUID | None = None
    status: ContractTemplateStatus | None = None
    html_content: str | None = None
    variables: list[TemplateVariable] | None = None


class TemplateFormField(BaseModel):
    """Talaba uchun dinamik forma fieldi — faqat student_input variablelar."""

    key: str
    label: str
    type: str = "text"
    required: bool = True
    options: list[str] | None = None
    placeholder: str | None = None
    defaultValue: str | None = None  # noqa: N815 — frontend camelCase kutadi


class TemplateFormResponse(BaseModel):
    """Talaba shablon tanlaganda qaytariladigan forma schema."""

    templateId: str  # noqa: N815
    templateName: str  # noqa: N815
    fields: list[TemplateFormField]
