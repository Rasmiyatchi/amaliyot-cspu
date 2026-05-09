"""AuditLog schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuditLogRead(BaseModel):
    id: UUID
    actor_user_id: UUID | None = None
    actor_role: str | None = None
    actor_name: str | None = None
    action: str
    entity_type: str
    entity_id: UUID | None = None
    summary: str
    metadata_json: dict[str, Any] | None = None
    ip: str | None = None
    user_agent: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
