"""Barcha ORM modellari — Alembic autogenerate ko'rishi uchun shu yerda import qilinadi."""

from app.models.academic import AcademicYear, Department, Direction, Faculty, Group
from app.models.area import Area
from app.models.attendance import AttendanceDay, AttendanceEvent, AttendanceOverride
from app.models.audit_log import AuditLog
from app.models.contract import Contract
from app.models.contract_template import ContractTemplateDoc
from app.models.document import Document
from app.models.enums import (
    ApplicationStatus,
    AssignmentStatus,
    AttendanceDayStatus,
    AttendanceEventKind,
    ContractStatus,
    ContractTemplate,
    DegreeType,
    DocumentKind,
    EducationForm,
    FinalReportStatus,
    Gender,
    JournalStatus,
    NotificationType,
    ObjectKind,
    OrganizationKind,
    Semester,
    StudentStatus,
    TaskCategory,
    TaskStatus,
    TaskType,
    UserRole,
)
from app.models.final_report import FinalReport
from app.models.inquiry import Inquiry, InquiryMessage
from app.models.notification import Notification
from app.models.organization import Organization
from app.models.practice_application import PracticeApplication
from app.models.practice_assignment import PracticeAssignment
from app.models.practice_type import PracticeType
from app.models.refresh_token import RefreshToken
from app.models.student import Student
from app.models.supervisor import Supervisor, SupervisorOrganization
from app.models.system_settings import SystemSettings
from app.models.task import JournalEntry, LessonAnalysis, Task, TaskTemplate
from app.models.user import User

__all__ = [
    "AcademicYear",
    "ApplicationStatus",
    "Area",
    "AssignmentStatus",
    "AttendanceDay",
    "AttendanceDayStatus",
    "AttendanceEvent",
    "AttendanceEventKind",
    "AttendanceOverride",
    "AuditLog",
    "Contract",
    "ContractStatus",
    "ContractTemplate",
    "ContractTemplateDoc",
    "DegreeType",
    "Department",
    "Direction",
    "Document",
    "DocumentKind",
    "EducationForm",
    "Faculty",
    "FinalReport",
    "FinalReportStatus",
    "Gender",
    "Group",
    "Inquiry",
    "InquiryMessage",
    "JournalEntry",
    "JournalStatus",
    "LessonAnalysis",
    "Notification",
    "NotificationType",
    "ObjectKind",
    "Organization",
    "OrganizationKind",
    "PracticeApplication",
    "PracticeAssignment",
    "PracticeType",
    "RefreshToken",
    "Semester",
    "Student",
    "StudentStatus",
    "Supervisor",
    "SupervisorOrganization",
    "SystemSettings",
    "Task",
    "TaskCategory",
    "TaskStatus",
    "TaskTemplate",
    "TaskType",
    "User",
    "UserRole",
]
