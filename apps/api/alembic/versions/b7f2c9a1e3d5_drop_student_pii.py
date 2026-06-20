"""drop student PII columns (birth_date, jshshir, passport_number)

Maxfiylik talabi (2026-06-20): talabalarning passport, JSHSHIR va tug'ilgan
sana ma'lumotlari saytda saqlanmasligi kerak. Ustunlar va ulardagi mavjud
qiymatlar butunlay o'chiriladi.

Revision ID: b7f2c9a1e3d5
Revises: a5b1d4e8c3f2
Create Date: 2026-06-20 17:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7f2c9a1e3d5"
down_revision: Union[str, Sequence[str], None] = "a5b1d4e8c3f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("students", "birth_date")
    op.drop_column("students", "jshshir")
    op.drop_column("students", "passport_number")


def downgrade() -> None:
    # Ma'lumot tiklanmaydi — faqat ustunlar qayta yaratiladi (bo'sh).
    op.add_column(
        "students",
        sa.Column("passport_number", sa.String(length=16), nullable=True),
    )
    op.add_column(
        "students",
        sa.Column("jshshir", sa.String(length=14), nullable=True),
    )
    op.add_column(
        "students",
        sa.Column("birth_date", sa.Date(), nullable=True),
    )
