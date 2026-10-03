"""contracts.contract_template_id + variable_values — qayta generatsiya barqarorligi

Revision ID: b2d4f6a8c0e3
Revises: a1c3e5f7b9d1
Create Date: 2026-10-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b2d4f6a8c0e3"
down_revision: str | Sequence[str] | None = "a1c3e5f7b9d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "contracts",
        sa.Column("contract_template_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        op.f("fk_contracts_contract_template_id_contract_templates"),
        "contracts",
        "contract_templates",
        ["contract_template_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_contracts_contract_template_id"), "contracts", ["contract_template_id"]
    )
    op.add_column(
        "contracts",
        sa.Column("variable_values", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("contracts", "variable_values")
    op.drop_index(op.f("ix_contracts_contract_template_id"), table_name="contracts")
    op.drop_constraint(
        op.f("fk_contracts_contract_template_id_contract_templates"),
        "contracts",
        type_="foreignkey",
    )
    op.drop_column("contracts", "contract_template_id")
