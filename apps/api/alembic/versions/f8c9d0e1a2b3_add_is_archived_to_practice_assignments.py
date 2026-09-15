"""practice_assignments: is_archived ustunini qo'shish

Revision ID: f8c9d0e1a2b3
Revises: e0f1a2b3c4d5
Create Date: 2026-09-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f8c9d0e1a2b3"
down_revision: str | Sequence[str] | None = "e0f1a2b3c4d5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "practice_assignments",
        sa.Column(
            "is_archived",
            sa.Boolean(),
            nullable=False,
            server_default="false",
            comment="Arxivlanganligi (boolean)",
        ),
    )
    op.create_index(
        op.f("ix_practice_assignments_is_archived"),
        "practice_assignments",
        ["is_archived"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_practice_assignments_is_archived"),
        table_name="practice_assignments",
    )
    op.drop_column("practice_assignments", "is_archived")
