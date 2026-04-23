"""Umumiy enum'lar — models ichida ishlatiladi."""

from enum import StrEnum


class UserRole(StrEnum):
    """Foydalanuvchi rollari — RBAC uchun asos."""

    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    SUPERVISOR = "supervisor"
    STUDENT = "student"
