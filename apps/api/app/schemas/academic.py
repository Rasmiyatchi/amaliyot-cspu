"""Academic schemas — Faculty, Direction, AcademicYear, Group."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ─── Faculty ──────────────────────────────────────────────
class FacultyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    code: str | None = Field(None, max_length=16)


class FacultyUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=200)
    code: str | None = Field(None, max_length=16)


class FacultyRead(BaseModel):
    id: UUID
    name: str
    code: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ─── Department (Kafedra) ─────────────────────────────────
class DepartmentCreate(BaseModel):
    faculty_id: UUID
    name: str = Field(..., min_length=2, max_length=200)
    code: str | None = Field(None, max_length=32)
    is_active: bool = True


class DepartmentUpdate(BaseModel):
    faculty_id: UUID | None = None
    name: str | None = Field(None, min_length=2, max_length=200)
    code: str | None = Field(None, max_length=32)
    is_active: bool | None = None


class DepartmentRead(BaseModel):
    id: UUID
    faculty_id: UUID
    name: str
    code: str | None
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ─── Direction ────────────────────────────────────────────
class DirectionCreate(BaseModel):
    faculty_id: UUID
    code: str = Field(..., pattern=r"^\d{8}$", description="8 raqamli HEMIS kodi")
    name: str = Field(..., min_length=2, max_length=200)


class DirectionUpdate(BaseModel):
    faculty_id: UUID | None = None
    code: str | None = Field(None, pattern=r"^\d{8}$")
    name: str | None = Field(None, min_length=2, max_length=200)


class DirectionRead(BaseModel):
    id: UUID
    faculty_id: UUID
    code: str
    name: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ─── AcademicYear ─────────────────────────────────────────
class AcademicYearCreate(BaseModel):
    name: str = Field(..., pattern=r"^\d{4}-\d{4}$", description="Masalan '2025-2026'")
    start_date: date
    end_date: date
    is_active: bool = False


class AcademicYearUpdate(BaseModel):
    name: str | None = Field(None, pattern=r"^\d{4}-\d{4}$")
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None


class AcademicYearRead(BaseModel):
    id: UUID
    name: str
    start_date: date
    end_date: date
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ─── Group ────────────────────────────────────────────────
class GroupCreate(BaseModel):
    direction_id: UUID
    academic_year_id: UUID
    name: str = Field(..., min_length=1, max_length=32)
    course: int = Field(..., ge=1, le=4)


class GroupUpdate(BaseModel):
    direction_id: UUID | None = None
    academic_year_id: UUID | None = None
    name: str | None = Field(None, min_length=1, max_length=32)
    course: int | None = Field(None, ge=1, le=4)


class GroupRead(BaseModel):
    id: UUID
    direction_id: UUID
    academic_year_id: UUID
    name: str
    course: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
