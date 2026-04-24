"""add notifications

Revision ID: 6854011443c1
Revises: 6ac1ca226b88
Create Date: 2026-04-24 12:27:14.472553

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "6854011443c1"
down_revision: str | Sequence[str] | None = "6ac1ca226b88"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # uq_academic_years_active — false positive

    notification_type = postgresql.ENUM(
        "task_approved",
        "task_rejected",
        "journal_approved",
        "journal_rejected",
        "analysis_approved",
        "analysis_rejected",
        "attendance_rejected",
        "attendance_override",
        "contract_generated",
        "contract_activated",
        "generic",
        name="notification_type",
        create_type=True,
    )
    notification_type.create(op.get_bind(), checkfirst=True)

    type_ref = postgresql.ENUM(
        "task_approved",
        "task_rejected",
        "journal_approved",
        "journal_rejected",
        "analysis_approved",
        "analysis_rejected",
        "attendance_rejected",
        "attendance_override",
        "contract_generated",
        "contract_activated",
        "generic",
        name="notification_type",
        create_type=False,
    )

    op.create_table(
        "notifications",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("type", type_ref, nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column(
            "data",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
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
            ["user_id"],
            ["users.id"],
            name=op.f("fk_notifications_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notifications")),
    )
    op.create_index(
        op.f("ix_notifications_read_at"), "notifications", ["read_at"], unique=False
    )
    op.create_index(op.f("ix_notifications_type"), "notifications", ["type"], unique=False)
    op.create_index(
        op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_notifications_user_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_type"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_read_at"), table_name="notifications")
    op.drop_table("notifications")
    op.execute("DROP TYPE IF EXISTS notification_type")
