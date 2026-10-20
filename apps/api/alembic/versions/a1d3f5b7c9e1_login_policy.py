"""Birinchi kirishda parolni majburiy almashtirish — rol bo'yicha sozlama

Avval har bir yangi talaba/supervizor birinchi kirishda parolni almashtirishga MAJBUR edi.
Natija: ko'pchilik yangi parolni eslab qolmay, ikkinchi kirishda "parol noto'g'ri" olardi
(brauzer esa eski, login bilan bir xil parolni saqlab qolgan). Endi bu talab talabalar va
supervizorlar uchun sozlamadan boshqariladi (standart: o'chiq). Adminlar uchun doim majburiy.

Revision ID: a1d3f5b7c9e1
Revises: f8c0e2a4b6d9
Create Date: 2026-10-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1d3f5b7c9e1"
down_revision: str | Sequence[str] | None = "f8c0e2a4b6d9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "system_settings",
        sa.Column(
            "force_password_change_students",
            sa.Boolean(),
            server_default="false",
            nullable=False,
            comment="Talabalar birinchi kirishda parolni almashtirishga majbur",
        ),
    )
    op.add_column(
        "system_settings",
        sa.Column(
            "force_password_change_supervisors",
            sa.Boolean(),
            server_default="false",
            nullable=False,
            comment="Supervizorlar birinchi kirishda parolni almashtirishga majbur",
        ),
    )


def downgrade() -> None:
    op.drop_column("system_settings", "force_password_change_supervisors")
    op.drop_column("system_settings", "force_password_change_students")
