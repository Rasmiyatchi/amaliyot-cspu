"""Baholash (grade breakdown) schemalari."""

from pydantic import BaseModel, Field


class CriterionScore(BaseModel):
    key: str
    name: str
    max: int
    grader: str | None = None
    #: Avtomatik hisoblanadimi (davomat / topshiriq ballari) yoki qo'lda qo'yiladimi
    auto: bool
    #: Qo'lda baholanadigan, hali qo'yilmagan mezonlarda None
    score: int | None = None
    #: Avtomatik mezonlar uchun tushuntirish, masalan "72% davomat"
    detail: str | None = None


class GradeBreakdown(BaseModel):
    assignment_id: str
    practice_type_name: str
    criteria: list[CriterionScore]
    total: int
    max_total: int
    min_total: int
    #: min_total belgilanmagan bo'lsa None
    passed: bool | None = None
    missing_criteria: list[str]
    complete: bool
    attendance_percent: int | None = None
    final_grade: int | None = None
    credit_earned: bool
    status: str


class CriterionScoreRequest(BaseModel):
    key: str = Field(..., min_length=1)
    score: int = Field(..., ge=0, le=100)
