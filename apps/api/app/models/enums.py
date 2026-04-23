"""Umumiy enum'lar — models ichida ishlatiladi."""

from enum import StrEnum


class UserRole(StrEnum):
    """Foydalanuvchi rollari — RBAC uchun asos."""

    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    SUPERVISOR = "supervisor"
    STUDENT = "student"


class StudentStatus(StrEnum):
    """Talaba o'qish statusi."""

    STUDYING = "studying"  # o'qiyapti
    GRADUATED = "graduated"  # bitirgan
    EXPELLED = "expelled"  # haydalgan
    ACADEMIC_LEAVE = "academic_leave"  # akademik ta'til


class Gender(StrEnum):
    MALE = "male"  # Erkak
    FEMALE = "female"  # Ayol


class EducationForm(StrEnum):
    """Ta'lim shakli."""

    DAYTIME = "daytime"  # Kunduzgi
    EVENING = "evening"  # Kechki
    CORRESPONDENCE = "correspondence"  # Sirtqi
    DISTANCE = "distance"  # Masofaviy


class DegreeType(StrEnum):
    """Ta'lim turi."""

    BACHELOR = "bachelor"  # Bakalavr
    MASTER = "master"  # Magistr
    PHD = "phd"  # Doktorantura/PhD
