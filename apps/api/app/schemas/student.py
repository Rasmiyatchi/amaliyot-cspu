"""Student schemas — admin barcha maydonlarni ko'radi, hech narsa yashirilmaydi."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

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


class StudentCreate(BaseModel):
    """Admin orqali bitta talaba qo'shish."""

    hemis_id: str = Field(..., min_length=4, max_length=20)
    username: str | None = Field(None, max_length=50, description="Bo'sh bo'lsa hemis_id ishlatiladi")
    password: str = Field(..., min_length=4, max_length=128)

    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=20)

    gender: Gender | None = None
    birth_date: date | None = None
    jshshir: str | None = Field(None, max_length=14)
    passport_number: str | None = Field(None, max_length=20)
    region: str | None = Field(None, max_length=100)
    district: str | None = Field(None, max_length=100)

    group_id: UUID
    current_semester: int | None = Field(None, ge=1, le=8)
    is_graduating: bool = False
    education_language: str | None = Field(None, max_length=20)
    education_form: EducationForm | None = None
    degree_type: DegreeType | None = None


class StudentUpdate(BaseModel):
    """Admin: talaba ma'lumotlarini tahrirlash (login/parol alohida endpoint orqali)."""

    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=20)

    gender: Gender | None = None
    birth_date: date | None = None
    jshshir: str | None = Field(None, max_length=14)
    passport_number: str | None = Field(None, max_length=20)
    region: str | None = Field(None, max_length=100)
    district: str | None = Field(None, max_length=100)

    group_id: UUID | None = None
    current_semester: int | None = Field(None, ge=1, le=8)
    is_graduating: bool | None = None
    education_language: str | None = Field(None, max_length=20)
    education_form: EducationForm | None = None
    degree_type: DegreeType | None = None
    status: StudentStatus | None = None
