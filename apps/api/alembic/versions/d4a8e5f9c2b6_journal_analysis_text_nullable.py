"""journal/analysis content_md/analysis_md nullable

Revision ID: d4a8e5f9c2b6
Revises: c9d2e4f7a1b3
Create Date: 2026-05-04 11:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4a8e5f9c2b6"
down_revision: Union[str, Sequence[str], None] = "c9d2e4f7a1b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("journal_entries", "content_md", existing_type=sa.Text(), nullable=True)
    op.alter_column("lesson_analyses", "analysis_md", existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    # Make NOT NULL again (only if no NULLs exist)
    op.execute("UPDATE journal_entries SET content_md = '' WHERE content_md IS NULL")
    op.execute("UPDATE lesson_analyses SET analysis_md = '' WHERE analysis_md IS NULL")
    op.alter_column("journal_entries", "content_md", existing_type=sa.Text(), nullable=False)
    op.alter_column("lesson_analyses", "analysis_md", existing_type=sa.Text(), nullable=False)
