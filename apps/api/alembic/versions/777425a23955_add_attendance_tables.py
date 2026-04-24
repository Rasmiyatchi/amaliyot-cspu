"""add attendance tables

Revision ID: 777425a23955
Revises: 2f299fdf8a29
Create Date: 2026-04-24 10:03:56.480527

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "777425a23955"
down_revision: str | Sequence[str] | None = "2f299fdf8a29"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # uq_academic_years_active — false positive (alembic autogenerate har safar detect qiladi)

    # Enum turlarini bir marta yaratamiz — boshqa joyda create_type=False bilan ishlatamiz
    day_status_enum = postgresql.ENUM(
        "pending", "green", "red", name="attendance_day_status", create_type=True
    )
    day_status_enum.create(op.get_bind(), checkfirst=True)

    event_kind_enum = postgresql.ENUM(
        "check_in", "check_out", name="attendance_event_kind", create_type=True
    )
    event_kind_enum.create(op.get_bind(), checkfirst=True)

    day_status_ref = postgresql.ENUM(
        "pending", "green", "red", name="attendance_day_status", create_type=False
    )
    event_kind_ref = postgresql.ENUM(
        "check_in", "check_out", name="attendance_event_kind", create_type=False
    )

    op.create_table(
        "attendance_days",
        sa.Column("assignment_id", sa.Uuid(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("status", day_status_ref, server_default="pending", nullable=False),
        sa.Column("check_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by_id", sa.Uuid(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
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
            name=op.f("fk_attendance_days_approved_by_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["assignment_id"],
            ["practice_assignments.id"],
            name=op.f("fk_attendance_days_assignment_id_practice_assignments"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_attendance_days")),
        sa.UniqueConstraint(
            "assignment_id", "date", name="uq_attendance_days_assignment_date"
        ),
    )
    op.create_index(
        op.f("ix_attendance_days_approved_by_id"),
        "attendance_days",
        ["approved_by_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_attendance_days_assignment_id"),
        "attendance_days",
        ["assignment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_attendance_days_date"), "attendance_days", ["date"], unique=False
    )
    op.create_index(
        op.f("ix_attendance_days_status"), "attendance_days", ["status"], unique=False
    )

    op.create_table(
        "attendance_events",
        sa.Column("attendance_day_id", sa.Uuid(), nullable=False),
        sa.Column("assignment_id", sa.Uuid(), nullable=False),
        sa.Column("kind", event_kind_ref, nullable=False),
        sa.Column("event_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lat", sa.Numeric(precision=10, scale=7), nullable=True),
        sa.Column("lng", sa.Numeric(precision=10, scale=7), nullable=True),
        sa.Column("accuracy_m", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column(
            "distance_m",
            sa.Numeric(precision=10, scale=2),
            nullable=True,
            comment="Obyekt markazigacha masofa (haversine) — audit uchun",
        ),
        sa.Column("is_within_fence", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("wifi_ssid", sa.String(length=64), nullable=True),
        sa.Column("device_id", sa.String(length=128), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
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
            name=op.f("fk_attendance_events_assignment_id_practice_assignments"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["attendance_day_id"],
            ["attendance_days.id"],
            name=op.f("fk_attendance_events_attendance_day_id_attendance_days"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_attendance_events")),
    )
    op.create_index(
        op.f("ix_attendance_events_assignment_id"),
        "attendance_events",
        ["assignment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_attendance_events_attendance_day_id"),
        "attendance_events",
        ["attendance_day_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_attendance_events_event_at"),
        "attendance_events",
        ["event_at"],
        unique=False,
    )

    op.create_table(
        "attendance_overrides",
        sa.Column("attendance_day_id", sa.Uuid(), nullable=False),
        sa.Column("super_admin_id", sa.Uuid(), nullable=False),
        sa.Column("previous_status", day_status_ref, nullable=False),
        sa.Column("new_status", day_status_ref, nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
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
            ["attendance_day_id"],
            ["attendance_days.id"],
            name=op.f("fk_attendance_overrides_attendance_day_id_attendance_days"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["super_admin_id"],
            ["users.id"],
            name=op.f("fk_attendance_overrides_super_admin_id_users"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_attendance_overrides")),
    )
    op.create_index(
        op.f("ix_attendance_overrides_attendance_day_id"),
        "attendance_overrides",
        ["attendance_day_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_attendance_overrides_super_admin_id"),
        "attendance_overrides",
        ["super_admin_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_attendance_overrides_super_admin_id"), table_name="attendance_overrides"
    )
    op.drop_index(
        op.f("ix_attendance_overrides_attendance_day_id"), table_name="attendance_overrides"
    )
    op.drop_table("attendance_overrides")
    op.drop_index(op.f("ix_attendance_events_event_at"), table_name="attendance_events")
    op.drop_index(
        op.f("ix_attendance_events_attendance_day_id"), table_name="attendance_events"
    )
    op.drop_index(
        op.f("ix_attendance_events_assignment_id"), table_name="attendance_events"
    )
    op.drop_table("attendance_events")
    op.drop_index(op.f("ix_attendance_days_status"), table_name="attendance_days")
    op.drop_index(op.f("ix_attendance_days_date"), table_name="attendance_days")
    op.drop_index(op.f("ix_attendance_days_assignment_id"), table_name="attendance_days")
    op.drop_index(op.f("ix_attendance_days_approved_by_id"), table_name="attendance_days")
    op.drop_table("attendance_days")

    op.execute("DROP TYPE IF EXISTS attendance_event_kind")
    op.execute("DROP TYPE IF EXISTS attendance_day_status")
