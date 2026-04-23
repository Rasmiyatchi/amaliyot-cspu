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


class ObjectKind(StrEnum):
    """Amaliyot obyekti turi."""

    ORGANIZATION = "organization"  # maktab, MTT, korxona (shartnomali)
    AREA = "area"  # hudud (Chimyon tog' kabi, shartnomasiz)
    ANY = "any"  # ikkalasi ham mumkin


class OrganizationKind(StrEnum):
    """Tashkilot turi."""

    SCHOOL = "school"  # Umumiy o'rta ta'lim maktabi
    MTT = "mtt"  # Maktabgacha ta'lim tashkiloti
    LYCEUM = "lyceum"  # Akademik litsey
    COLLEGE = "college"  # Kasb-hunar kolleji
    COMPANY = "company"  # Ishlab chiqarish korxonasi
    UNIVERSITY = "university"  # Universitet/OTM
    OTHER = "other"


class AssignmentStatus(StrEnum):
    """Amaliyot biriktirish statusi."""

    DRAFT = "draft"  # Yaratilgan, hali aktivlashmagan
    ACTIVE = "active"  # Hozir davom etyapti
    COMPLETED = "completed"  # Yakunlangan, baholash kutilmoqda
    CANCELLED = "cancelled"  # Bekor qilingan


class ContractStatus(StrEnum):
    """Shartnoma statusi.

    DRAFT → GENERATED (PDF+QR) → ACTIVE (imzolangan skan) → EXPIRED yoki REVOKED
    """

    DRAFT = "draft"  # admin yaratdi, hali PDF generatsiya qilinmagan
    GENERATED = "generated"  # PDF + QR yaratildi, imzo kutilmoqda
    ACTIVE = "active"  # supervizor imzolangan skanni yukladi
    EXPIRED = "expired"  # end_date o'tdi
    REVOKED = "revoked"  # qo'lda bekor qilindi


class ContractTemplate(StrEnum):
    """Shartnoma PDF shabloni — 3 asosiy template + hamkorlik."""

    FOUR_PLUS_TWO = "4_plus_2"
    PEDAGOGICAL = "pedagogical"
    QUALIFYING = "qualifying"
    INTERNSHIP_PRODUCTION = "internship_production"
    PARTNERSHIP = "partnership"  # Dastlabki hamkorlik (№8490 kabi)
