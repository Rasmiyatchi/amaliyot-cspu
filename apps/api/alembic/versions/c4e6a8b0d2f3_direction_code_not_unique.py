"""directions.code not unique; unique on (code, name)

Bir kod bilan turli nomli yo'nalishlar bo'lishi mumkin. Faqat (kod+nom) juftligi
takrorlanmas bo'ladi.

Revision ID: c4e6a8b0d2f3
Revises: b3d5f7a9c1e2
Create Date: 2026-06-30

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c4e6a8b0d2f3"
down_revision: Union[str, Sequence[str], None] = "b3d5f7a9c1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Eski UNIQUE index (kod bo'yicha) — olib tashlaymiz, oddiy index qoldiramiz.
    op.drop_index("ix_directions_code", table_name="directions")
    op.create_index("ix_directions_code", "directions", ["code"], unique=False)
    # Yangi: (kod + nom) juftligi unikal.
    op.create_unique_constraint(
        "uq_directions_code_name", "directions", ["code", "name"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_directions_code_name", "directions", type_="unique")
    op.drop_index("ix_directions_code", table_name="directions")
    op.create_index("ix_directions_code", "directions", ["code"], unique=True)
