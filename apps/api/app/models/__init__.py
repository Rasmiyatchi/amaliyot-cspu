"""Barcha ORM modellari — Alembic autogenerate ko'rishi uchun shu yerda import qilinadi."""

from app.models.academic import AcademicYear, Direction, Faculty, Group
from app.models.area import Area
from app.models.attendance import AttendanceDay, AttendanceEvent, AttendanceOverride
from app.models.contract import Contract
from app.models.enums import (
    AssignmentStatus,
    AttendanceDayStatus,
    AttendanceEventKind,
    ContractStatus,
    ContractTemplate,
    DegreeType,
    EducationForm,
    Gender,
    JournalStatus,
    ObjectKind,
    OrganizationKind,
    Semester,
    StudentStatus,
    TaskCategory,
    TaskStatus,
    TaskType,
    UserRole,
)
from app.models.organization import Organization
from app.models.practice_assignment import PracticeAssignment
from app.models.practice_type import PracticeType
from app.models.refresh_token import RefreshToken
from app.models.student import Student
from app.models.supervisor import Supervisor
from app.models.task import JournalEntry, LessonAnalysis, Task, TaskTemplate
from app.models.user import User

__all__ = [
    "AcademicYear",
    "Area",
    "AssignmentStatus",
    "AttendanceDay",
    "AttendanceDayStatus",
    "AttendanceEvent",
    "AttendanceEventKind",
    "AttendanceOverride",
    "Contract",
    "ContractStatus",
    "ContractTemplate",
    "DegreeType",
    "Direction",
    "EducationForm",
    "Faculty",
    "Gender",
    "Group",
    "JournalEntry",
    "JournalStatus",
    "LessonAnalysis",
    "ObjectKind",
    "Organization",
    "OrganizationKind",
    "PracticeAssignment",
    "PracticeType",
    "RefreshToken",
    "Semester",
    "Student",
    "StudentStatus",
    "Supervisor",
    "Task",
    "TaskCategory",
    "TaskStatus",
    "TaskTemplate",
    "TaskType",
    "User",
    "UserRole",
]
