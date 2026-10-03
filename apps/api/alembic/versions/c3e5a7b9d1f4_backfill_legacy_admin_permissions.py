"""Ruxsatlar joriy qilingunga qadar yaratilgan adminlarga barcha modullarni qaytarish

`f9a1b2c3d4e5` (2026-09-27) `users.permissions` ustunini `{}` bilan qo'shdi: mavjud adminlar
hech qanday modulga kira olmay qoldi, admin ro'yxatida esa bo'sh ro'yxat "Standart (barcha)"
deb ko'rsatildi — super admin ularni to'liq ruxsatli deb bilardi. Shu sanadan OLDIN yaratilgan
va ruxsatlari bo'sh adminlarga barcha modullar beriladi. Keyin yaratilgan (forma bilan ataylab
bo'sh qoldirilgan) adminlarga tegilmaydi.

Revision ID: c3e5a7b9d1f4
Revises: b2d4f6a8c0e3
Create Date: 2026-10-03
"""

from collections.abc import Sequence

from alembic import op

revision: str = "c3e5a7b9d1f4"
down_revision: str | Sequence[str] | None = "b2d4f6a8c0e3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE users
        SET permissions = ARRAY[
            'structure', 'practice', 'contracts', 'supervisors',
            'partners', 'monitoring', 'inquiries', 'system'
        ]::varchar(64)[]
        WHERE role = 'admin'
          AND cardinality(permissions) = 0
          AND created_at < TIMESTAMPTZ '2026-09-27 00:00:00+05'
        """
    )


def downgrade() -> None:
    # Ma'lumot tuzatish — orqaga qaytarilmaydi (qaysi admin bo'sh bo'lganini bilmaymiz)
    pass
