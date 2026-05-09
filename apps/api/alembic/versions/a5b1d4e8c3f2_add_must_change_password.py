"""add must_change_password to users

Revision ID: a5b1d4e8c3f2
Revises: f3e8c2a4b6d1
Create Date: 2026-05-04 17:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a5b1d4e8c3f2"
down_revision: Union[str, Sequence[str], None] = "f3e8c2a4b6d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "must_change_password",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_users_must_change_password", "users", ["must_change_password"]
    )


def downgrade() -> None:
    op.drop_index("ix_users_must_change_password", table_name="users")
    op.drop_column("users", "must_change_password")
