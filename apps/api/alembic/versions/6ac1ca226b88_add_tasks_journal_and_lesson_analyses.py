"""add tasks journal and lesson analyses

Revision ID: 6ac1ca226b88
Revises: 777425a23955
Create Date: 2026-04-24 10:46:25.878087

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "6ac1ca226b88"
down_revision: str | Sequence[str] | None = "777425a23955"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # uq_academic_years_active — false positive (alembic autogenerate har safar detect qiladi)

    # Enum'larni alohida yaratamiz (bir nechta jadval ishlatadi)
    semester_enum = postgresql.ENUM(
        "fall", "spring", name="semester", create_type=True
    )
    semester_enum.create(op.get_bind(), checkfirst=True)

    task_category_enum = postgresql.ENUM(
        "spiritual", "academic", "report", name="task_category", create_type=True
    )
    task_category_enum.create(op.get_bind(), checkfirst=True)

    task_type_enum = postgresql.ENUM(
        "essay",
        "event_scenario",
        "event_participation",
        "analytical_note",
        "plan",
        "protocol",
        "presentation",
        "open_lesson",
        "test_lesson",
        "lesson_analysis_batch",
        "interactive_pack",
        "other",
        name="task_type",
        create_type=True,
    )
    task_type_enum.create(op.get_bind(), checkfirst=True)

    task_status_enum = postgresql.ENUM(
        "not_started",
        "submitted",
        "approved",
        "rejected",
        name="task_status",
        create_type=True,
    )
    task_status_enum.create(op.get_bind(), checkfirst=True)

    journal_status_enum = postgresql.ENUM(
        "draft",
        "submitted",
        "approved",
        "rejected",
        name="journal_status",
        create_type=True,
    )
    journal_status_enum.create(op.get_bind(), checkfirst=True)

    # Endi kolonalarda create_type=False
    semester_ref = postgresql.ENUM(
        "fall", "spring", name="semester", create_type=False
    )
    task_category_ref = postgresql.ENUM(
        "spiritual", "academic", "report", name="task_category", create_type=False
    )
    task_type_ref = postgresql.ENUM(
        "essay",
        "event_scenario",
        "event_participation",
        "analytical_note",
        "plan",
        "protocol",
        "presentation",
        "open_lesson",
        "test_lesson",
        "lesson_analysis_batch",
        "interactive_pack",
        "other",
        name="task_type",
        create_type=False,
    )
    task_status_ref = postgresql.ENUM(
        "not_started", "submitted", "approved", "rejected", name="task_status", create_type=False
    )
    journal_status_ref = postgresql.ENUM(
        "draft", "submitted", "approved", "rejected", name="journal_status", create_type=False
    )

    op.create_table(
        "task_templates",
        sa.Column("practice_type_id", sa.Uuid(), nullable=False),
        sa.Column("course", sa.Integer(), nullable=False, comment="3 yoki 4"),
        sa.Column("semester", semester_ref, nullable=False),
        sa.Column("category", task_category_ref, nullable=False),
        sa.Column("type", task_type_ref, nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("points", sa.Integer(), nullable=False, comment="Maksimal ball"),
        sa.Column(
            "quantity",
            sa.Integer(),
            server_default="1",
            nullable=False,
            comment="Bir nechta (masalan 12 ta dars tahlili)",
        ),
        sa.Column(
            "month_hint",
            sa.String(length=32),
            nullable=True,
            comment="Tavsiya etilgan oy (oktyabr, noyabr...)",
        ),
        sa.Column(
            "display_order",
            sa.Integer(),
            server_default="0",
            nullable=False,
            comment="Sillabusdagi tartib",
        ),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["practice_type_id"],
            ["practice_types.id"],
            name=op.f("fk_task_templates_practice_type_id_practice_types"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_task_templates")),
        sa.UniqueConstraint(
            "practice_type_id",
            "course",
            "semester",
            "category",
            "display_order",
            name="uq_task_templates_slot",
        ),
    )
    op.create_index(
        op.f("ix_task_templates_category"), "task_templates", ["category"], unique=False
    )
    op.create_index(
        op.f("ix_task_templates_course"), "task_templates", ["course"], unique=False
    )
    op.create_index(
        op.f("ix_task_templates_practice_type_id"),
        "task_templates",
        ["practice_type_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_task_templates_semester"), "task_templates", ["semester"], unique=False
    )

    op.create_table(
        "journal_entries",
        sa.Column("assignment_id", sa.Uuid(), nullable=False),
        sa.Column("date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("content_md", sa.Text(), nullable=False),
        sa.Column(
            "attachments",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=False,
        ),
        sa.Column("status", journal_status_ref, server_default="draft", nullable=False),
        sa.Column("approved_by_id", sa.Uuid(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["approved_by_id"],
            ["users.id"],
            name=op.f("fk_journal_entries_approved_by_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["assignment_id"],
            ["practice_assignments.id"],
            name=op.f("fk_journal_entries_assignment_id_practice_assignments"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_journal_entries")),
    )
    op.create_index(
        op.f("ix_journal_entries_approved_by_id"),
        "journal_entries",
        ["approved_by_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_journal_entries_assignment_id"),
        "journal_entries",
        ["assignment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_journal_entries_date"), "journal_entries", ["date"], unique=False
    )
    op.create_index(
        op.f("ix_journal_entries_status"), "journal_entries", ["status"], unique=False
    )

    op.create_table(
        "lesson_analyses",
        sa.Column("assignment_id", sa.Uuid(), nullable=False),
        sa.Column("date", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "subject",
            sa.String(length=200),
            nullable=False,
            comment="Fan nomi (masalan Biologiya)",
        ),
        sa.Column(
            "teacher_name",
            sa.String(length=200),
            nullable=False,
            comment="Kuzatilgan o'qituvchi",
        ),
        sa.Column(
            "grade_level",
            sa.String(length=32),
            nullable=True,
            comment="Sinf (masalan 7-B)",
        ),
        sa.Column("quarter", sa.Integer(), nullable=False, comment="1-4 chorak"),
        sa.Column("analysis_md", sa.Text(), nullable=False),
        sa.Column(
            "attachments",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=False,
        ),
        sa.Column("status", journal_status_ref, server_default="draft", nullable=False),
        sa.Column("approved_by_id", sa.Uuid(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["approved_by_id"],
            ["users.id"],
            name=op.f("fk_lesson_analyses_approved_by_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["assignment_id"],
            ["practice_assignments.id"],
            name=op.f("fk_lesson_analyses_assignment_id_practice_assignments"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_lesson_analyses")),
    )
    op.create_index(
        op.f("ix_lesson_analyses_approved_by_id"),
        "lesson_analyses",
        ["approved_by_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_lesson_analyses_assignment_id"),
        "lesson_analyses",
        ["assignment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_lesson_analyses_date"), "lesson_analyses", ["date"], unique=False
    )
    op.create_index(
        op.f("ix_lesson_analyses_quarter"), "lesson_analyses", ["quarter"], unique=False
    )
    op.create_index(
        op.f("ix_lesson_analyses_status"), "lesson_analyses", ["status"], unique=False
    )

    op.create_table(
        "tasks",
        sa.Column("assignment_id", sa.Uuid(), nullable=False),
        sa.Column("template_id", sa.Uuid(), nullable=False),
        sa.Column(
            "status", task_status_ref, server_default="not_started", nullable=False
        ),
        sa.Column("submission_md", sa.Text(), nullable=True),
        sa.Column(
            "attachments",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=False,
        ),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("points_earned", sa.Integer(), nullable=True),
        sa.Column("graded_by_id", sa.Uuid(), nullable=True),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["assignment_id"],
            ["practice_assignments.id"],
            name=op.f("fk_tasks_assignment_id_practice_assignments"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["graded_by_id"],
            ["users.id"],
            name=op.f("fk_tasks_graded_by_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["template_id"],
            ["task_templates.id"],
            name=op.f("fk_tasks_template_id_task_templates"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tasks")),
        sa.UniqueConstraint(
            "assignment_id", "template_id", name="uq_tasks_assignment_template"
        ),
    )
    op.create_index(op.f("ix_tasks_assignment_id"), "tasks", ["assignment_id"], unique=False)
    op.create_index(op.f("ix_tasks_graded_by_id"), "tasks", ["graded_by_id"], unique=False)
    op.create_index(op.f("ix_tasks_status"), "tasks", ["status"], unique=False)
    op.create_index(op.f("ix_tasks_template_id"), "tasks", ["template_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_tasks_template_id"), table_name="tasks")
    op.drop_index(op.f("ix_tasks_status"), table_name="tasks")
    op.drop_index(op.f("ix_tasks_graded_by_id"), table_name="tasks")
    op.drop_index(op.f("ix_tasks_assignment_id"), table_name="tasks")
    op.drop_table("tasks")

    op.drop_index(op.f("ix_lesson_analyses_status"), table_name="lesson_analyses")
    op.drop_index(op.f("ix_lesson_analyses_quarter"), table_name="lesson_analyses")
    op.drop_index(op.f("ix_lesson_analyses_date"), table_name="lesson_analyses")
    op.drop_index(op.f("ix_lesson_analyses_assignment_id"), table_name="lesson_analyses")
    op.drop_index(op.f("ix_lesson_analyses_approved_by_id"), table_name="lesson_analyses")
    op.drop_table("lesson_analyses")

    op.drop_index(op.f("ix_journal_entries_status"), table_name="journal_entries")
    op.drop_index(op.f("ix_journal_entries_date"), table_name="journal_entries")
    op.drop_index(op.f("ix_journal_entries_assignment_id"), table_name="journal_entries")
    op.drop_index(op.f("ix_journal_entries_approved_by_id"), table_name="journal_entries")
    op.drop_table("journal_entries")

    op.drop_index(op.f("ix_task_templates_semester"), table_name="task_templates")
    op.drop_index(op.f("ix_task_templates_practice_type_id"), table_name="task_templates")
    op.drop_index(op.f("ix_task_templates_course"), table_name="task_templates")
    op.drop_index(op.f("ix_task_templates_category"), table_name="task_templates")
    op.drop_table("task_templates")

    op.execute("DROP TYPE IF EXISTS journal_status")
    op.execute("DROP TYPE IF EXISTS task_status")
    op.execute("DROP TYPE IF EXISTS task_type")
    op.execute("DROP TYPE IF EXISTS task_category")
    op.execute("DROP TYPE IF EXISTS semester")
