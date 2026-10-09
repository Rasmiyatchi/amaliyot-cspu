"""Qayta biriktirish va ommaviy tahrirlash sxemalari (TZ 08.10.2026, 1–2-bo'limlar).

Ikkala amal ham ikki bosqichli: `dry_run=true` — oldindan ko'rish (hech narsa yozilmaydi),
`dry_run=false` — tasdiqlangan qo'llash. Natija har bir element uchun ok/xato ko'rinishida.
"""

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models.enums import Semester
from app.schemas.practice_assignment import RequiredWeekdays

#: Bir so'rovda ko'pi bilan shuncha biriktirish (guruh/fakultet filtri bilan ham)
BULK_MAX = 1000


class ReassignScope(BaseModel):
    """Manba biriktirishlar: qaysi o'quv yili/semestrdan, kimlar uchun."""

    academic_year_id: UUID
    semester: Semester | None = None
    practice_type_id: UUID | None = None
    # Qamrov — kamida bittasi: aniq biriktirishlar, talabalar, guruh yoki fakultet
    assignment_ids: list[UUID] | None = Field(None, max_length=BULK_MAX)
    student_ids: list[UUID] | None = Field(None, max_length=BULK_MAX)
    group_id: UUID | None = None
    faculty_id: UUID | None = None

    @model_validator(mode="after")
    def _one_scope(self) -> "ReassignScope":
        if not any([self.assignment_ids, self.student_ids, self.group_id, self.faculty_id]):
            raise ValueError("Qamrov tanlanmagan: talaba, guruh yoki fakultet ko'rsating")
        return self


class ReassignTarget(BaseModel):
    """Yangi davr: faqat amaliyot turi, semestr, sanalar va majburiy kunlar o'zgaradi;
    obyekt (tashkilot/hudud) va supervizor manbadan avtomatik ko'chiriladi."""

    practice_type_id: UUID | None = Field(None, description="Bo'sh — manba turi saqlanadi")
    academic_year_id: UUID | None = Field(None, description="Bo'sh — manba o'quv yili")
    semester: Semester | None = None
    start_date: date
    end_date: date
    required_weekdays: RequiredWeekdays = None
    keep_weekdays: bool = Field(True, description="Majburiy kunlar berilmasa manbadagisi saqlansin")
    activate: bool = Field(False, description="Yangi biriktirishlar darhol 'active' bo'lsin")
    notes: str | None = Field(None, max_length=1000)

    @model_validator(mode="after")
    def _dates(self) -> "ReassignTarget":
        if self.end_date < self.start_date:
            raise ValueError("end_date start_date'dan oldin bo'lolmaydi")
        return self


class ReassignRequest(BaseModel):
    source: ReassignScope
    target: ReassignTarget
    dry_run: bool = True


class ReassignItem(BaseModel):
    source_assignment_id: UUID
    student_id: UUID
    student_full_name: str
    student_hemis_id: str
    group_name: str | None = None
    object_name: str | None = None
    supervisor_full_name: str | None = None
    source_practice_type_name: str
    source_semester: Semester | None = None
    source_start_date: date
    source_end_date: date
    source_status: str
    target_practice_type_name: str | None = None
    target_semester: Semester | None = None
    target_required_weekdays: list[int] | None = None
    ok: bool
    error: str | None = None
    new_assignment_id: UUID | None = None


class ReassignResult(BaseModel):
    dry_run: bool
    total: int
    ok: int
    failed: int
    created: int
    items: list[ReassignItem]
    assignment_ids: list[UUID]


class AssignmentBulkChanges(BaseModel):
    """O'zgartiriladigan maydonlar — faqat yuborilganlari qo'llanadi (`exclude_unset`).
    `supervisor_id: null` — supervizorni olib tashlash."""

    required_weekdays: RequiredWeekdays = None
    supervisor_id: UUID | None = None
    start_date: date | None = None
    end_date: date | None = None


class AssignmentBulkUpdateRequest(BaseModel):
    assignment_ids: list[UUID] | None = Field(None, max_length=BULK_MAX)
    group_id: UUID | None = None
    academic_year_id: UUID | None = None
    semester: Semester | None = None
    practice_type_id: UUID | None = None
    changes: AssignmentBulkChanges
    dry_run: bool = True

    @model_validator(mode="after")
    def _scope_and_changes(self) -> "AssignmentBulkUpdateRequest":
        if not self.assignment_ids and not self.group_id:
            raise ValueError("Qamrov tanlanmagan: biriktirishlar yoki guruh ko'rsating")
        if not self.changes.model_fields_set:
            raise ValueError("O'zgartiriladigan maydon tanlanmagan")
        return self


class BulkChange(BaseModel):
    field: str
    before: object = None
    after: object = None
    #: Odamga tushunarli qiymat (masalan, supervizor F.I.SH.) — UUID o'rniga ko'rsatish uchun
    before_label: str | None = None
    after_label: str | None = None


class BulkUpdateItem(BaseModel):
    assignment_id: UUID
    student_full_name: str
    student_hemis_id: str
    group_name: str | None = None
    status: str
    changes: list[BulkChange]
    ok: bool
    error: str | None = None


class BulkUpdateResult(BaseModel):
    dry_run: bool
    total: int
    ok: int
    failed: int
    updated: int
    unchanged: int
    items: list[BulkUpdateItem]


ScopeKind = Literal["selected", "group", "faculty"]
