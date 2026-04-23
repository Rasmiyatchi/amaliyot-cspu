"""Barcha ORM modellari — Alembic autogenerate ko'rishi uchun shu yerda import qilinadi."""

from app.models.academic import AcademicYear, Direction, Faculty, Group
from app.models.area import Area
from app.models.contract import Contract
from app.models.enums import (
    AssignmentStatus,
    ContractStatus,
    ContractTemplate,
    DegreeType,
    EducationForm,
    Gender,
    ObjectKind,
    OrganizationKind,
    StudentStatus,
    UserRole,
)
from app.models.organization import Organization
from app.models.practice_assignment import PracticeAssignment
from app.models.practice_type import PracticeType
from app.models.refresh_token import RefreshToken
from app.models.student import Student
from app.models.supervisor import Supervisor
from app.models.user import User

__all__ = [
    "AcademicYear",
    "Area",
    "AssignmentStatus",
    "Contract",
    "ContractStatus",
    "ContractTemplate",
    "DegreeType",
    "Direction",
    "EducationForm",
    "Faculty",
    "Gender",
    "Group",
    "ObjectKind",
    "Organization",
    "OrganizationKind",
    "PracticeAssignment",
    "PracticeType",
    "RefreshToken",
    "Student",
    "StudentStatus",
    "Supervisor",
    "User",
    "UserRole",
]
