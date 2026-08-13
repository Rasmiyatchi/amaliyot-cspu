"""Eski 'pending' arizalarni 'submitted' ga ko'chirish + yangi default

Revision ID: d9e0f1a2b3c4
Revises: 72e4984da737
Create Date: 2026-08-13

Python ApplicationStatus enum'ida PENDING endi yo'q — bazada qolgan har bir
'pending' qator ORM o'qishida LookupError beradi. c2deccd1b321 qiymatlarni
autocommit'da qo'shgan (allaqachon commit bo'lgan), endi ma'lumotni xavfsiz
ko'chirsak bo'ladi va ustun default'ini ham yangi oqimga moslaymiz.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "d9e0f1a2b3c4"
down_revision: str | Sequence[str] | None = "72e4984da737"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "UPDATE practice_applications SET status = 'submitted' WHERE status = 'pending'"
    )
    op.execute(
        "ALTER TABLE practice_applications "
        "ALTER COLUMN status SET DEFAULT 'submitted'::application_status"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE practice_applications "
        "ALTER COLUMN status SET DEFAULT 'pending'::application_status"
    )
    # submitted -> pending qaytarish shart emas: eski kod 'submitted' ni tanimaydi,
    # lekin downgrade faqat favqulodda stsenariy — qatorlarni ham qaytaramiz.
    op.execute(
        "UPDATE practice_applications SET status = 'pending' WHERE status = 'submitted'"
    )
