"""Kirish cheklovi (access restriction) sxemalari."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import RestrictionMode, RestrictionTarget


class AccessRestrictionCreate(BaseModel):
    target_type: RestrictionTarget
    #: Foydalanuvchi — to'g'ridan-to'g'ri user_id yoki talaba/supervizor yozuvi orqali
    user_id: UUID | None = None
    student_id: UUID | None = None
    supervisor_id: UUID | None = None
    group_id: UUID | None = None
    mode: RestrictionMode = RestrictionMode.RESTRICTED
    #: Foydalanuvchiga ko'rinadigan matn
    message: str | None = Field(None, max_length=1000)
    #: Ichki sabab (faqat adminlar)
    note: str | None = Field(None, max_length=1000)
    ends_at: datetime | None = None

    @model_validator(mode="after")
    def _target_matches(self) -> "AccessRestrictionCreate":
        if self.target_type == RestrictionTarget.USER and not (
            self.user_id or self.student_id or self.supervisor_id
        ):
            raise ValueError("user_id, student_id yoki supervisor_id majburiy")
        if self.target_type == RestrictionTarget.GROUP and not self.group_id:
            raise ValueError("group_id majburiy")
        return self


class AccessRestrictionRead(BaseModel):
    id: UUID
    target_type: RestrictionTarget
    user_id: UUID | None
    group_id: UUID | None
    #: Talaba/supervizor F.I.SH. yoki guruh nomi
    target_name: str | None = None
    #: Foydalanuvchi uchun login, guruh uchun yo'nalish
    target_detail: str | None = None
    #: Guruh cheklovida — qamrab olingan talabalar soni
    affected_count: int | None = None
    mode: RestrictionMode
    message: str | None
    note: str | None
    ends_at: datetime | None
    is_active: bool
    #: Faol va muddati tugamagan
    is_effective: bool
    created_by_name: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AccessRestrictionPublic(BaseModel):
    """Cheklangan foydalanuvchiga 423 javobda qaytadigan ma'lumot."""

    mode: RestrictionMode
    message: str | None
    ends_at: datetime | None
