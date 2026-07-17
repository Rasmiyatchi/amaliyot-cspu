"""practice_assignments: semester, required_weekdays, criteria_scores

Revision ID: e6a8c0d2f4b5
Revises: d5f7a9c1e3b4
Create Date: 2026-07-17

12.07 feedback qarorlari:
  - semester: kuzgi/bahorgi baho ALOHIDA chiqadi (har semestr o'z 100 balli bahosi).
    `semester` PG enum tipi allaqachon mavjud (task_templates uchun 6ac1ca226b88 da
    yaratilgan), shuning uchun create_type=False — aks holda "type already exists".
  - required_weekdays: talabani biriktirayotganda qaysi kunlari borishi belgilanadi.
    Davomat foizining maxraji shundan hisoblanadi.
  - criteria_scores: qo'lda baholanadigan mezonlar (tadbirlar, hisobot himoyasi).
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "e6a8c0d2f4b5"
down_revision = "d5f7a9c1e3b4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "practice_assignments",
        sa.Column(
            "semester",
            postgresql.ENUM("fall", "spring", name="semester", create_type=False),
            nullable=True,
        ),
    )
    op.create_index(
        op.f("ix_practice_assignments_semester"),
        "practice_assignments",
        ["semester"],
    )
    op.add_column(
        "practice_assignments",
        sa.Column(
            "required_weekdays",
            postgresql.ARRAY(sa.Integer()),
            nullable=True,
            comment="ISO hafta kunlari (1=Du..7=Ya) — davomat foizi maxraji",
        ),
    )
    op.add_column(
        "practice_assignments",
        sa.Column(
            "criteria_scores",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
            comment="Qo'lda baholanadigan mezonlar: {mezon_key: ball}",
        ),
    )


def downgrade() -> None:
    op.drop_column("practice_assignments", "criteria_scores")
    op.drop_column("practice_assignments", "required_weekdays")
    op.drop_index(op.f("ix_practice_assignments_semester"), table_name="practice_assignments")
    op.drop_column("practice_assignments", "semester")
    # `semester` enum tipini o'chirmaymiz — task_templates hali ishlatadi.
