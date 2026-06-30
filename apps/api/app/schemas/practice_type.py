"""PracticeType Pydantic schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ObjectKind


class GradingCriterion(BaseModel):
    key: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=100)
    max: int = Field(..., ge=0, le=100)
    grader: str = Field(..., description="system | supervisor | organization | department_head")


class GradingRules(BaseModel):
    min_total: int = Field(0, ge=0, le=100)
    criteria: list[GradingCriterion] = Field(default_factory=list)


class PracticeTypeBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=64, pattern=r"^[a-z0-9_]+$")
    name: str = Field(..., min_length=2, max_length=200)
    description: str | None = None

    requires_contract: bool = True
    contract_template_ref: str | None = Field(None, max_length=64)

    object_kind: ObjectKind

    min_weeks: int = Field(..., ge=1, le=52)
    max_weeks: int = Field(..., ge=1, le=52)
    days_per_week: int | None = Field(None, ge=1, le=7)
    hours_per_day: int | None = Field(None, ge=1, le=12)

    allowed_courses: list[int] = Field(default_factory=list)
    allowed_education_forms: list[str] = Field(default_factory=list)
    grading_rules: dict[str, Any] = Field(default_factory=dict)
    syllabus_md: str | None = None

    is_active: bool = True
    display_order: int = 0


class PracticeTypeCreate(PracticeTypeBase):
    pass


class PracticeTypeUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=200)
    description: str | None = None
    requires_contract: bool | None = None
    contract_template_ref: str | None = Field(None, max_length=64)
    object_kind: ObjectKind | None = None
    min_weeks: int | None = Field(None, ge=1, le=52)
    max_weeks: int | None = Field(None, ge=1, le=52)
    days_per_week: int | None = Field(None, ge=1, le=7)
    hours_per_day: int | None = Field(None, ge=1, le=12)
    allowed_courses: list[int] | None = None
    allowed_education_forms: list[str] | None = None
    grading_rules: dict[str, Any] | None = None
    syllabus_md: str | None = None
    is_active: bool | None = None
    display_order: int | None = None


class PracticeTypeRead(PracticeTypeBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
