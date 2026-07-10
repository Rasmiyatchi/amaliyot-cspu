"""add contract fields to practice_applications

Revision ID: d5f7a9c1e3b4
Revises: c4e6a8b0d2f3
Create Date: 2026-06-30

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "d5f7a9c1e3b4"
down_revision: Union[str, Sequence[str], None] = "c4e6a8b0d2f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "practice_applications",
        sa.Column("contract_template_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "practice_applications",
        sa.Column("contract_number", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "practice_applications",
        sa.Column("contract_file", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_index(
        "ix_practice_applications_contract_template_id",
        "practice_applications",
        ["contract_template_id"],
    )
    op.create_unique_constraint(
        "uq_practice_applications_contract_number",
        "practice_applications",
        ["contract_number"],
    )
    op.create_foreign_key(
        "fk_practice_applications_contract_template",
        "practice_applications",
        "contract_templates",
        ["contract_template_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_practice_applications_contract_template",
        "practice_applications",
        type_="foreignkey",
    )
    op.drop_constraint(
        "uq_practice_applications_contract_number",
        "practice_applications",
        type_="unique",
    )
    op.drop_index(
        "ix_practice_applications_contract_template_id",
        table_name="practice_applications",
    )
    op.drop_column("practice_applications", "contract_file")
    op.drop_column("practice_applications", "contract_number")
    op.drop_column("practice_applications", "contract_template_id")
