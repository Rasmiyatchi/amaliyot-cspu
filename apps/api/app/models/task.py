"""Task — amaliyot topshiriqlari.

TaskTemplate: sillabusdan namunaviy topshiriqlar (practice_type + kurs + semestr).
Task: talaba uchun aniq instance (assignment + template + status + submission).
JournalEntry: kundalik yozuvlari.
LessonAnalysis: dars tahlili.
"""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import (
    JournalStatus,
    Semester,
    TaskCategory,
    TaskStatus,
    TaskType,
)


class TaskTemplate(UUIDMixin, TimestampMixin, Base):
    """Sillabusdan namunaviy topshiriq — yaratilganda barcha mos assignment'larga
    instance (Task) yaratiladi."""

    __tablename__ = "task_templates"
    __table_args__ = (
        UniqueConstraint(
            "practice_type_id",
            "course",
            "semester",
            "category",
            "display_order",
            name="uq_task_templates_slot",
        ),
    )

    practice_type_id: Mapped[UUID] = mapped_column(
        ForeignKey("practice_types.id", ondelete="CASCADE"), index=True
    )
    course: Mapped[int] = mapped_column(Integer, index=True, comment="3 yoki 4")
    semester: Mapped[Semester] = mapped_column(
        SAEnum(
            Semester,
            name="semester",
            values_callable=lambda e: [m.value for m in e],
        ),
        index=True,
    )
    category: Mapped[TaskCategory] = mapped_column(
        SAEnum(
            TaskCategory,
            name="task_category",
            values_callable=lambda e: [m.value for m in e],
        ),
        index=True,
    )
    type: Mapped[TaskType] = mapped_column(
        SAEnum(
            TaskType,
            name="task_type",
            values_callable=lambda e: [m.value for m in e],
        ),
    )

    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    points: Mapped[int] = mapped_column(Integer, comment="Maksimal ball")
    quantity: Mapped[int] = mapped_column(
        Integer,
        default=1,
        server_default="1",
        comment="Bir nechta (masalan 12 ta dars tahlili)",
    )
    month_hint: Mapped[str | None] = mapped_column(
        String(32), nullable=True, comment="Tavsiya etilgan oy (oktyabr, noyabr...)"
    )

    display_order: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", comment="Sillabusdagi tartib"
    )
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")

    def __repr__(self) -> str:
        return f"<TaskTemplate {self.course}-kurs {self.semester} {self.title[:40]}>"


class Task(UUIDMixin, TimestampMixin, Base):
    """Talaba topshirig'i — assignment bo'yicha template instance."""

    __tablename__ = "tasks"
    __table_args__ = (
        UniqueConstraint(
            "assignment_id", "template_id", name="uq_tasks_assignment_template"
        ),
    )

    assignment_id: Mapped[UUID] = mapped_column(
        ForeignKey("practice_assignments.id", ondelete="CASCADE"), index=True
    )
    template_id: Mapped[UUID] = mapped_column(
        ForeignKey("task_templates.id", ondelete="RESTRICT"), index=True
    )

    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(
            TaskStatus,
            name="task_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=TaskStatus.NOT_STARTED,
        server_default=TaskStatus.NOT_STARTED.value,
        index=True,
    )

    submission_md: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachments: Mapped[list[dict[str, str]]] = mapped_column(
        JSONB, default=list, server_default="[]"
    )

    due_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    points_earned: Mapped[int | None] = mapped_column(Integer, nullable=True)
    graded_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<Task assignment={self.assignment_id} status={self.status}>"


class JournalEntry(UUIDMixin, TimestampMixin, Base):
    """Kundalik yozuvi — kunlik amaliyot izohi."""

    __tablename__ = "journal_entries"

    assignment_id: Mapped[UUID] = mapped_column(
        ForeignKey("practice_assignments.id", ondelete="CASCADE"), index=True
    )
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    content_md: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachments: Mapped[list[dict[str, str]]] = mapped_column(
        JSONB, default=list, server_default="[]"
    )

    status: Mapped[JournalStatus] = mapped_column(
        SAEnum(
            JournalStatus,
            name="journal_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=JournalStatus.DRAFT,
        server_default=JournalStatus.DRAFT.value,
        index=True,
    )

    approved_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<JournalEntry assignment={self.assignment_id} date={self.date}>"


class LessonAnalysis(UUIDMixin, TimestampMixin, Base):
    """Dars tahlili — fan o'qituvchisining darsini kuzatib tahlil qilish."""

    __tablename__ = "lesson_analyses"

    assignment_id: Mapped[UUID] = mapped_column(
        ForeignKey("practice_assignments.id", ondelete="CASCADE"), index=True
    )

    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    subject: Mapped[str] = mapped_column(String(200), comment="Fan nomi (masalan Biologiya)")
    teacher_name: Mapped[str] = mapped_column(String(200), comment="Kuzatilgan o'qituvchi")
    grade_level: Mapped[str | None] = mapped_column(
        String(32), nullable=True, comment="Sinf (masalan 7-B)"
    )
    quarter: Mapped[int] = mapped_column(Integer, index=True, comment="1-4 chorak")

    analysis_md: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachments: Mapped[list[dict[str, str]]] = mapped_column(
        JSONB, default=list, server_default="[]"
    )

    status: Mapped[JournalStatus] = mapped_column(
        SAEnum(
            JournalStatus,
            name="journal_status",
            values_callable=lambda e: [m.value for m in e],
            create_type=False,
        ),
        default=JournalStatus.DRAFT,
        server_default=JournalStatus.DRAFT.value,
        index=True,
    )

    approved_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<LessonAnalysis assignment={self.assignment_id} {self.subject} Q{self.quarter}>"
