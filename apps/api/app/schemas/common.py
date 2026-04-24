"""Umumiy schemalar: pagination, filter params."""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class Paginated(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class CredentialsUpdate(BaseModel):
    """Admin orqali user credentials yangilash — ikkalasi ham ixtiyoriy.

    Faqat kiritilgan maydonlar yangilanadi. Ikkalasi bo'sh bo'lsa 400 xato.
    """

    username: str | None = Field(None, min_length=3, max_length=64)
    password: str | None = Field(None, min_length=4, max_length=128)
