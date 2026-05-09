"""add due_date and notes to tasks

Revision ID: b8f1a2c5d6e7
Revises: a273e821ba2b
Create Date: 2026-05-03 14:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b8f1a2c5d6e7"
down_revision: Union[str, Sequence[str], None] = "a273e821ba2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("due_date", sa.Date(), nullable=True))
    op.add_column("tasks", sa.Column("notes", sa.Text(), nullable=True))
    op.create_index("ix_tasks_due_date", "tasks", ["due_date"])


def downgrade() -> None:
    op.drop_index("ix_tasks_due_date", table_name="tasks")
    op.drop_column("tasks", "notes")
    op.drop_column("tasks", "due_date")
