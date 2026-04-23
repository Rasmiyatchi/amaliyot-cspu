"""Barcha ORM modellari — Alembic autogenerate ko'rishi uchun shu yerda import qilinadi."""

from app.models.academic import AcademicYear, Direction, Faculty, Group
from app.models.enums import (
    DegreeType,
    EducationForm,
    Gender,
    StudentStatus,
    UserRole,
)
from app.models.refresh_token import RefreshToken
from app.models.student import Student
from app.models.user import User

__all__ = [
    "AcademicYear",
    "DegreeType",
    "Direction",
    "EducationForm",
    "Faculty",
    "Gender",
    "Group",
    "RefreshToken",
    "Student",
    "StudentStatus",
    "User",
    "UserRole",
]
