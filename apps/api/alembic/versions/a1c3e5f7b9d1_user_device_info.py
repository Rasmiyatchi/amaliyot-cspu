"""users.device_info — bog'langan qurilma tafsiloti (JSONB)

Revision ID: a1c3e5f7b9d1
Revises: f9a1b2c3d4e5
Create Date: 2026-10-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a1c3e5f7b9d1"
down_revision: str | Sequence[str] | None = "f9a1b2c3d4e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "device_info",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            comment="Bog'langan qurilma tafsiloti: platforma, model, brauzer, ekran, vaqt zonasi, IP",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "device_info")
