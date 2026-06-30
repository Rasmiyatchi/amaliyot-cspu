"""add practice_applications table

Revision ID: a2c4e6b8d0f1
Revises: f1b3d5a7c9e0
Create Date: 2026-06-30

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a2c4e6b8d0f1"
down_revision: Union[str, Sequence[str], None] = "f1b3d5a7c9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    application_status = postgresql.ENUM(
        "pending", "approved", "rejected", name="application_status", create_type=True
    )
    application_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "practice_applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("object_name", sa.String(length=300), nullable=False),
        sa.Column("object_location", sa.String(length=500), nullable=False),
        sa.Column("manager_name", sa.String(length=200), nullable=True),
        sa.Column("manager_phone", sa.String(length=32), nullable=False),
        sa.Column("region", sa.String(length=64), nullable=True),
        sa.Column("district", sa.String(length=64), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "pending", "approved", "rejected", name="application_status", create_type=False
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("qr_token", sa.String(length=32), nullable=True),
        sa.Column("reviewed_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("qr_token"),
    )
    op.create_index("ix_practice_applications_student_id", "practice_applications", ["student_id"])
    op.create_index("ix_practice_applications_status", "practice_applications", ["status"])
    op.create_index("ix_practice_applications_region", "practice_applications", ["region"])


def downgrade() -> None:
    op.drop_index("ix_practice_applications_region", table_name="practice_applications")
    op.drop_index("ix_practice_applications_status", table_name="practice_applications")
    op.drop_index("ix_practice_applications_student_id", table_name="practice_applications")
    op.drop_table("practice_applications")
    op.execute("DROP TYPE IF EXISTS application_status")
