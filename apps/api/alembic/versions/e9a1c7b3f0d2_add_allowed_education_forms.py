"""add allowed_education_forms to practice_types

Revision ID: e9a1c7b3f0d2
Revises: d2e4f6a8b1c3
Create Date: 2026-06-30

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e9a1c7b3f0d2"
down_revision: Union[str, None] = "d2e4f6a8b1c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "practice_types",
        sa.Column(
            "allowed_education_forms",
            sa.ARRAY(sa.String()),
            nullable=False,
            server_default="{}",
        ),
    )


def downgrade() -> None:
    op.drop_column("practice_types", "allowed_education_forms")
