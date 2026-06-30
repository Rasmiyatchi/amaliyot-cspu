"""add contract_templates table

Revision ID: f1b3d5a7c9e0
Revises: e9a1c7b3f0d2
Create Date: 2026-06-30

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "f1b3d5a7c9e0"
down_revision: Union[str, Sequence[str], None] = "e9a1c7b3f0d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contract_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("practice_type_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("file_attachment", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("placeholders", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["practice_type_id"], ["practice_types.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_contract_templates_practice_type_id", "contract_templates", ["practice_type_id"]
    )
    op.create_index(
        "ix_contract_templates_created_by_id", "contract_templates", ["created_by_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_contract_templates_created_by_id", table_name="contract_templates")
    op.drop_index("ix_contract_templates_practice_type_id", table_name="contract_templates")
    op.drop_table("contract_templates")
