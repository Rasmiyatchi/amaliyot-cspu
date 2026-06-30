"""Inquiry (talaba ↔ admin murojaat) schemalari."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class InquiryCreate(BaseModel):
    subject: str = Field(..., min_length=2, max_length=200)
    body: str = Field(..., min_length=1, max_length=2000)


class MessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class MessageRead(BaseModel):
    id: UUID
    from_admin: bool
    sender_id: UUID | None = None
    body: str
    created_at: datetime


class InquiryRead(BaseModel):
    id: UUID
    student_id: UUID
    student_name: str | None = None
    subject: str
    is_resolved: bool
    message_count: int = 0
    last_message_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class InquiryDetailRead(InquiryRead):
    messages: list[MessageRead] = []
