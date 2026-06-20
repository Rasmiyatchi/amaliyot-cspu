"""user device binding (bitta qurilmadan kirish)

users.device_id, device_label, device_bound_at — talaba bitta qurilmaga
bog'lanadi; boshqa qurilmadan kirishga urinish bloklanadi.

Revision ID: d2e4f6a8b1c3
Revises: c1d3e5f7a9b2
Create Date: 2026-06-20 19:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d2e4f6a8b1c3"
down_revision: Union[str, Sequence[str], None] = "c1d3e5f7a9b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("device_id", sa.String(length=128), nullable=True))
    op.add_column("users", sa.Column("device_label", sa.String(length=255), nullable=True))
    op.add_column(
        "users",
        sa.Column("device_bound_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_device_id", "users", ["device_id"])


def downgrade() -> None:
    op.drop_index("ix_users_device_id", table_name="users")
    op.drop_column("users", "device_bound_at")
    op.drop_column("users", "device_label")
    op.drop_column("users", "device_id")
