"""Ommaviy xabarlar (admin → talabalar/supervizorlar) sxemalari — TZ 08.10.2026, 3-bo'lim."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

BroadcastAudience = Literal[
    "all_students",  # barcha talabalar
    "faculty",  # fakultet talabalari
    "group",  # guruh talabalari
    "students",  # tanlangan talabalar
    "supervisors",  # supervizorlar (fakultet bo'yicha ixtiyoriy)
    "everyone",  # talabalar + supervizorlar
]

#: Tanlab yuborishda bir so'rovda maksimal talabalar soni
BROADCAST_SELECT_MAX = 1000


class BroadcastCreate(BaseModel):
    audience: BroadcastAudience
    faculty_id: UUID | None = None
    group_id: UUID | None = None
    student_ids: list[UUID] | None = Field(None, max_length=BROADCAST_SELECT_MAX)
    subject: str = Field(..., min_length=3, max_length=200)
    body: str = Field(..., min_length=3, max_length=4000)
    #: true — faqat qabul qiluvchilar sonini hisoblash (hech narsa yuborilmaydi)
    dry_run: bool = False

    @model_validator(mode="after")
    def _target(self) -> "BroadcastCreate":
        if self.audience == "faculty" and not self.faculty_id:
            raise ValueError("Fakultet tanlanmagan")
        if self.audience == "group" and not self.group_id:
            raise ValueError("Guruh tanlanmagan")
        if self.audience == "students" and not self.student_ids:
            raise ValueError("Talabalar tanlanmagan")
        return self


class BroadcastRead(BaseModel):
    id: UUID
    sender_id: UUID | None
    sender_name: str | None
    audience: str
    faculty_id: UUID | None
    faculty_name: str | None
    group_id: UUID | None
    group_name: str | None
    target_user_ids: list[UUID] | None = None
    subject: str
    body: str
    recipients_count: int
    sent_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BroadcastPreview(BaseModel):
    recipients_count: int
    faculty_name: str | None = None
    group_name: str | None = None


class BroadcastResult(BroadcastRead):
    pass
