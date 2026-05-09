"""add final_reports

Revision ID: e7c5a3b9d2f4
Revises: d4a8e5f9c2b6
Create Date: 2026-05-04 14:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e7c5a3b9d2f4"
down_revision: Union[str, Sequence[str], None] = "d4a8e5f9c2b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enum
    final_report_status = postgresql.ENUM(
        "draft",
        "submitted",
        "approved",
        "rejected",
        name="final_report_status",
        create_type=True,
    )
    final_report_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "final_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("assignment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column(
            "file_attachment", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                "draft",
                "submitted",
                "approved",
                "rejected",
                name="final_report_status",
                create_type=False,
            ),
            server_default="submitted",
            nullable=False,
        ),
        sa.Column("reviewer_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewer_note", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["assignment_id"], ["practice_assignments.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assignment_id", name="uq_final_reports_assignment"),
    )
    op.create_index("ix_final_reports_assignment_id", "final_reports", ["assignment_id"])
    op.create_index("ix_final_reports_status", "final_reports", ["status"])
    op.create_index("ix_final_reports_reviewer_id", "final_reports", ["reviewer_id"])


def downgrade() -> None:
    op.drop_index("ix_final_reports_reviewer_id", table_name="final_reports")
    op.drop_index("ix_final_reports_status", table_name="final_reports")
    op.drop_index("ix_final_reports_assignment_id", table_name="final_reports")
    op.drop_table("final_reports")
    op.execute("DROP TYPE IF EXISTS final_report_status")
