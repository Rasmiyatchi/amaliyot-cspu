"""add html_content to contract_templates

Revision ID: a1b2c3d4e5f6
Revises: f1b3d5a7c9e0
Create Date: 2026-08-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f7b9d1e3a5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "contract_templates",
        sa.Column("html_content", sa.Text(), nullable=True),
    )
    # file_attachment maydonni nullable qilish (HTML shablon uchun docx shart emas)
    op.alter_column(
        "contract_templates",
        "file_attachment",
        existing_type=sa.JSON(),
        nullable=True,
    )


def downgrade() -> None:
    # HTML-only shablonlarda file_attachment NULL — NOT NULL qaytarishdan oldin
    # ularni o'chirish shart, aks holda downgrade o'zi yiqiladi.
    op.execute("DELETE FROM contract_templates WHERE file_attachment IS NULL")
    op.alter_column(
        "contract_templates",
        "file_attachment",
        existing_type=sa.JSON(),
        nullable=False,
    )
    op.drop_column("contract_templates", "html_content")
