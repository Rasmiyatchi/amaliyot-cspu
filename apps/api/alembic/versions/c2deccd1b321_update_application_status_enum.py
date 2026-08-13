"""application_status enum'iga yangi qiymatlar + pending ma'lumotini ko'chirish

Revision ID: c2deccd1b321
Revises: c3afea00a423
Create Date: 2026-08-11

Qo'lda qayta yozilgan. Asl variantda op.execute("COMMIT") hack'i bor edi —
u env.py'ning yagona-tranzaksiya yuritishini buzadi va asyncpg ostida mo'rt.
env.py butun upgrade'ni bitta tranzaksiyada yuritadi, yangi enum qiymatini esa
o'sha tranzaksiyada ishlatib bo'lmaydi — shuning uchun rasmiy yechim:
Alembic'ning autocommit_block'i (ADD VALUE uchun aynan shu tavsiya etiladi).
Data-ko'chirish (pending -> submitted) keyingi migratsiyada (d9e0f1a2b3c4).

MUHIM: Python enum'dan PENDING olib tashlangan — bazadagi eski 'pending'
qatorlar ko'chirilmaguncha o'qishda yiqiladi. Shu sabab d9e0f1a2b3c4 shart.
'pending' qiymati PG tipida qoladi (PG enum qiymatini o'chira olmaydi) — zararsiz.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "c2deccd1b321"
down_revision: str | Sequence[str] | None = "c3afea00a423"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_NEW_VALUES = (
    "draft",
    "submitted",
    "under_review",
    "revision_required",
    "resubmitted",
    "active",
    "expired",
    "archived",
)


def upgrade() -> None:
    with op.get_context().autocommit_block():
        for val in _NEW_VALUES:
            op.execute(f"ALTER TYPE application_status ADD VALUE IF NOT EXISTS '{val}'")


def downgrade() -> None:
    # PG enum qiymatlarini olib tashlay olmaydi — qiymatlar qoladi (zararsiz).
    pass
