"""Kunlik majburiy amaliyot vaqti: umumiy sozlama + talaba uchun individual

- system_settings.min_practice_minutes — "ketish"ni qayd etish uchun kelgandan keyin o'tishi
  shart bo'lgan minimal vaqt (daqiqa). Avval kodda 6 soat qattiq yozilgan edi; endi 4 soat
  (240) va admin sozlamalaridan o'zgartiriladi.
- students.min_practice_minutes — shu talaba uchun individual qiymat; NULL — umumiy sozlama.

Revision ID: f8c0e2a4b6d9
Revises: e6b8d0f2a4c7
Create Date: 2026-10-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f8c0e2a4b6d9"
down_revision: str | Sequence[str] | None = "e6b8d0f2a4c7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "system_settings",
        sa.Column(
            "min_practice_minutes",
            sa.Integer(),
            server_default="240",
            nullable=False,
            comment="Ketishni qayd etish uchun minimal amaliyot vaqti (daqiqa)",
        ),
    )
    # op.f — to'liq nom (modeldagi naming convention bilan bir xil: ck_<jadval>_<nom>)
    op.create_check_constraint(
        op.f("ck_system_settings_min_practice_minutes_range"),
        "system_settings",
        "min_practice_minutes BETWEEN 0 AND 720",
    )
    op.add_column(
        "students",
        sa.Column(
            "min_practice_minutes",
            sa.Integer(),
            nullable=True,
            comment="Individual minimal amaliyot vaqti (daqiqa); NULL — umumiy sozlama",
        ),
    )
    op.create_check_constraint(
        op.f("ck_students_min_practice_minutes_range"),
        "students",
        "min_practice_minutes IS NULL OR min_practice_minutes BETWEEN 0 AND 720",
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_students_min_practice_minutes_range"), "students", type_="check")
    op.drop_column("students", "min_practice_minutes")
    op.drop_constraint(
        op.f("ck_system_settings_min_practice_minutes_range"), "system_settings", type_="check"
    )
    op.drop_column("system_settings", "min_practice_minutes")
