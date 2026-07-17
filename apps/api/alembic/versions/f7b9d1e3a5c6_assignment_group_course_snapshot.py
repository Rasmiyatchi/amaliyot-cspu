"""practice_assignments: biriktirish paytidagi guruh/kurs snapshot'i

Revision ID: f7b9d1e3a5c6
Revises: e6a8c0d2f4b5
Create Date: 2026-07-17

Muammo: Student o'quv yiliga faqat o'zgaruvchan group_id orqali bog'langan.
Talaba guruhi o'zgarsa (yil almashishi, xato tuzatish) tarixiy hisobotlar —
qaydnoma, yig'ma jild PDF, supervizor hisoboti, CSVlar — yangi guruh/kurs
bilan qayta yozilib ketadi. Contract bu muammoni JSONB snapshot bilan to'g'ri
hal qilgan; endi PracticeAssignment ham biriktirish paytidagi qiymatni muzlatadi.

Backfill FK'dan OLDIN: student_id NOT NULL, shuning uchun barcha qatorlar
qamrab olinadi; guruhsiz talabalar to'g'ri NULL/NULL bo'lib qoladi.
ondelete=RESTRICT (SET NULL emas) — tarixiy guruhni o'chirish task.py dagi
kurs aniqlashni buzmasligi uchun.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "f7b9d1e3a5c6"
down_revision = "e6a8c0d2f4b5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) Nullable ustunlar — PG16 da metadata-only, bir zumda
    op.add_column(
        "practice_assignments",
        sa.Column(
            "group_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
            comment="Biriktirish paytidagi guruh (snapshot)",
        ),
    )
    op.add_column(
        "practice_assignments",
        sa.Column(
            "course",
            sa.Integer(),
            nullable=True,
            comment="Biriktirish paytidagi kurs (snapshot)",
        ),
    )

    # 2) Backfill — FK'dan OLDIN, joriy holatdan (bugun "hozirgi guruh" =
    #    "biriktirish paytidagi guruh", chunki yil almashish hali bo'lmagan)
    op.execute(
        """
        UPDATE practice_assignments pa
        SET group_id = s.group_id,
            course   = g.course
        FROM students s
        LEFT JOIN groups g ON g.id = s.group_id
        WHERE s.id = pa.student_id
        """
    )

    # 3) Nomlangan constraint'lar backfill'dan KEYIN
    op.create_index(
        op.f("ix_practice_assignments_group_id"),
        "practice_assignments",
        ["group_id"],
    )
    op.create_foreign_key(
        "fk_practice_assignments_group_id_groups",
        "practice_assignments",
        "groups",
        ["group_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_practice_assignments_group_id_groups",
        "practice_assignments",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_practice_assignments_group_id"), table_name="practice_assignments"
    )
    op.drop_column("practice_assignments", "course")
    op.drop_column("practice_assignments", "group_id")
