"""Supervisor excel import schemalari."""

from pydantic import BaseModel


class SupervisorImportError(BaseModel):
    row: int
    name: str | None = None
    message: str


class SupervisorImportCredentials(BaseModel):
    full_name: str
    username: str
    password: str  # plaintext — faqat javobda bir marta


class SupervisorImportResponse(BaseModel):
    total_rows: int
    created: int
    skipped: int
    errors: list[SupervisorImportError]
    credentials: list[SupervisorImportCredentials]
