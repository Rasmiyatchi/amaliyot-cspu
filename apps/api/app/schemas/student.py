"""Student schemas — admin barcha maydonlarni ko'radi, hech narsa yashirilmaydi."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import DegreeType, EducationForm, Gender, StudentStatus


class StudentRead(BaseModel):
    # Identity
    id: UUID
    user_id: UUID
    hemis_id: str
    username: str

    # User profile
    first_name: str
    last_name: str
    middle_name: str | None
    full_name: str
    email: EmailStr | None
    phone: str | None
    avatar_url: str | None
    is_active: bool
    last_login_at: datetime | None

    # Shaxsiy
    gender: Gender | None
    birth_date: date | None

    # PII (admin ko'radi — foydalanuvchi talabi 2026-04-23)
    jshshir: str | None
    passport_number: str | None

    # Manzil
    region: str | None
    district: str | None

    # Akademik
    group_id: UUID | None
    group_name: str | None
    direction_id: UUID | None
    direction_code: str | None
    direction_name: str | None
    faculty_id: UUID | None
    faculty_name: str | None
    course: int | None
    current_semester: int | None
    is_graduating: bool
    enrollment_year: int | None

    # Ta'lim turi
    education_language: str | None
    education_form: EducationForm | None
    degree_type: DegreeType | None

    # Status
    status: StudentStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
