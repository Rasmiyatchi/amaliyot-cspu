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
    COLLEGE = "college"  # Professional ta'lim muassasasi
    UNIVERSITY = "university"  # Oliy ta'lim muassasasi
    STATE_ORGANIZATION = "state_organization"  # Davlat tashkiloti
    PRIVATE_ORGANIZATION = "private_organization"  # Xususiy tashkilot
    COMPANY = "company"  # Korxona
    OTHER = "other"  # Boshqa


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


class ContractTemplateStatus(StrEnum):
    """Shartnoma shabloni holati."""

    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class ApplicationStatus(StrEnum):
    """Talaba amaliyot arizasi statusi."""

    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    REVISION_REQUIRED = "revision_required"
    RESUBMITTED = "resubmitted"
    APPROVED = "approved"
    ACTIVE = "active"
    REJECTED = "rejected"
    EXPIRED = "expired"
    ARCHIVED = "archived"


class AttendanceDayStatus(StrEnum):
    """Kunlik davomat statusi.

    PENDING → talaba check-in qildi, supervizor tasdiqi kutilyapti
    GREEN → supervizor tasdiqladi yoki super admin override bilan yashilga o'tkazdi
    RED → supervizor rad etdi yoki kun yakunida check-in bo'lmadi (avto)
    """

    PENDING = "pending"
    GREEN = "green"
    RED = "red"


class AttendanceEventKind(StrEnum):
    """Event turi."""

    CHECK_IN = "check_in"
    CHECK_OUT = "check_out"


class Semester(StrEnum):
    """Semestr — kuzgi yoki bahorgi."""

    FALL = "fall"
    SPRING = "spring"


class TaskCategory(StrEnum):
    """Topshiriq kategoriyasi — sillabusdagi guruhlash.

    - SPIRITUAL: Ma'naviy ishlari (tadbirlar, ssenariylar, essela)
    - ACADEMIC: O'quv ishlari (dars tahlili, sinov darsi, prezentatsiyalar)
    - REPORT: Hisobot (yakuniy jild)
    """

    SPIRITUAL = "spiritual"
    ACADEMIC = "academic"
    REPORT = "report"


class TaskType(StrEnum):
    """Topshiriq turi — UI/validatsiya uchun."""

    ESSAY = "essay"  # 100 so'zli insho
    EVENT_SCENARIO = "event_scenario"  # tadbir ssenariysi
    EVENT_PARTICIPATION = "event_participation"  # tadbirda ishtirok etish
    ANALYTICAL_NOTE = "analytical_note"  # tahliliy ma'lumotnoma
    PLAN = "plan"  # reja (shaxsiy, to'garak rejasi)
    PROTOCOL = "protocol"  # bayonnoma (yig'ilish, konferensiya)
    PRESENTATION = "presentation"  # prezentatsiya
    OPEN_LESSON = "open_lesson"  # ochiq dars
    TEST_LESSON = "test_lesson"  # sinov dars
    LESSON_ANALYSIS_BATCH = "lesson_analysis_batch"  # N ta dars tahlili (quantity)
    INTERACTIVE_PACK = "interactive_pack"  # interfaol topshiriqlar to'plami
    OTHER = "other"


class TaskStatus(StrEnum):
    """Topshiriq holati — talaba bajarish oqimi.

    NOT_STARTED → SUBMITTED (talaba yubordi) → APPROVED yoki REJECTED (supervizor)
    REJECTED'dan keyin qayta yuborish: SUBMITTED ga o'tadi (revision loop).
    """

    NOT_STARTED = "not_started"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


class JournalStatus(StrEnum):
    """Kundalik yozuvi yoki dars tahlili holati."""

    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


class NotificationType(StrEnum):
    """Xabar kategoriyasi — UI'da icon/rang tanlash uchun."""

    TASK_APPROVED = "task_approved"
    TASK_REJECTED = "task_rejected"
    JOURNAL_APPROVED = "journal_approved"
    JOURNAL_REJECTED = "journal_rejected"
    ANALYSIS_APPROVED = "analysis_approved"
    ANALYSIS_REJECTED = "analysis_rejected"
    ATTENDANCE_REJECTED = "attendance_rejected"
    ATTENDANCE_OVERRIDE = "attendance_override"
    CONTRACT_GENERATED = "contract_generated"
    CONTRACT_ACTIVATED = "contract_activated"
    GENERIC = "generic"


class DocumentKind(StrEnum):
    """Hujjat turi — admin yuklaydigan amaliyot bo'yicha hujjatlar."""

    REGULATION = "regulation"  # Normativ hujjatlar (umumiy)
    PROGRAM = "program"  # Amaliyot dasturlari (har turga)


class FinalReportStatus(StrEnum):
    """Yakuniy hisobot status oqimi."""

    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
