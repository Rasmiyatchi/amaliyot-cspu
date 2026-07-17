"""Qaydnomalar (records) schemalari."""

from datetime import date
from uuid import UUID

from pydantic import BaseModel


class RecordRow(BaseModel):
    assignment_id: UUID
    student_name: str
    direction_name: str | None = None
    direction_code: str | None = None
    group_name: str | None = None
    course: int | None = None
    education_form: str | None = None
    practice_type_name: str
    object_name: str | None = None
    supervisor_name: str | None = None
    start_date: date
    end_date: date
    semester: str | None = None
    semester_label: str | None = None
    attendance_pct: int | None = None
    korxona_grade: int | None = None
    korxona_grade_max: int | None = None
    qaydnoma_grade: int | None = None
    credit_earned: bool | None = None
