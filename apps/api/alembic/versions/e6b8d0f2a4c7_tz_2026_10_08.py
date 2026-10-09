"""TZ 08.10.2026 — ommaviy xabarlar, qayta biriktirish izi, audit jurnali kengaytmasi

- broadcasts: admin yuborgan ommaviy xabarlar tarixi (mavzu, matn, auditoriya, soni, vaqti)
- notification_type enum'iga 'broadcast' qiymati
- practice_assignments.source_assignment_id: qayta biriktirishda manba (eski semestr) izi
- audit_logs o'zgarmaslik trigger'i: yozuvlar o'chirilmaydi va tahrirlanmaydi (append-only).
  Faqat foydalanuvchi o'chirilganda FK ON DELETE SET NULL (actor_user_id → NULL) o'tadi.

Revision ID: e6b8d0f2a4c7
Revises: d4f6b8c0e2a5
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e6b8d0f2a4c7"
down_revision: str | Sequence[str] | None = "d4f6b8c0e2a5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

AUDIT_GUARD_FN = """
CREATE OR REPLACE FUNCTION audit_logs_append_only() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'audit_logs yozuvlari o''chirilmaydi (append-only)'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    -- Foydalanuvchi o'chirilganda FK ON DELETE SET NULL faqat actor_user_id ni tozalaydi
    IF NEW.actor_user_id IS NULL AND OLD.actor_user_id IS NOT NULL
       AND NEW.actor_role IS NOT DISTINCT FROM OLD.actor_role
       AND NEW.actor_name IS NOT DISTINCT FROM OLD.actor_name
       AND NEW.action = OLD.action
       AND NEW.entity_type = OLD.entity_type
       AND NEW.entity_id IS NOT DISTINCT FROM OLD.entity_id
       AND NEW.summary = OLD.summary
       AND NEW.metadata_json IS NOT DISTINCT FROM OLD.metadata_json
       AND NEW.ip IS NOT DISTINCT FROM OLD.ip
       AND NEW.user_agent IS NOT DISTINCT FROM OLD.user_agent
       AND NEW.created_at = OLD.created_at THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'audit_logs yozuvlari tahrirlanmaydi (append-only)'
        USING ERRCODE = 'insufficient_privilege';
END
$$ LANGUAGE plpgsql;
"""


def upgrade() -> None:
    # 1. Ommaviy xabarlar tarixi
    op.create_table(
        "broadcasts",
        sa.Column("sender_id", sa.Uuid(), nullable=True),
        sa.Column("sender_name", sa.String(length=200), nullable=True),
        sa.Column("audience", sa.String(length=32), nullable=False),
        sa.Column("faculty_id", sa.Uuid(), nullable=True),
        sa.Column("faculty_name", sa.String(length=200), nullable=True),
        sa.Column("group_id", sa.Uuid(), nullable=True),
        sa.Column("group_name", sa.String(length=64), nullable=True),
        sa.Column(
            "target_user_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            comment="Tanlangan talabalar (user_id ro'yxati) — audience='students' bo'lsa",
        ),
        sa.Column("subject", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("recipients_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["sender_id"], ["users.id"], name="fk_broadcasts_sender_id_users", ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["faculty_id"],
            ["faculties.id"],
            name="fk_broadcasts_faculty_id_faculties",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["group_id"], ["groups.id"], name="fk_broadcasts_group_id_groups", ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_broadcasts"),
    )
    op.create_index("ix_broadcasts_sender_id", "broadcasts", ["sender_id"])
    op.create_index("ix_broadcasts_sent_at", "broadcasts", ["sent_at"])

    # 2. Qayta biriktirish izi — manba biriktirish (eski semestr) o'chirilmaydi, faqat bog'lanadi
    op.add_column(
        "practice_assignments",
        sa.Column(
            "source_assignment_id",
            sa.Uuid(),
            nullable=True,
            comment="Qayta biriktirishda manba (oldingi semestr) biriktirishi",
        ),
    )
    op.create_foreign_key(
        "fk_practice_assignments_source_assignment_id",
        "practice_assignments",
        "practice_assignments",
        ["source_assignment_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_practice_assignments_source_assignment_id",
        "practice_assignments",
        ["source_assignment_id"],
    )

    # 3. Audit jurnali: append-only trigger (created_at indeksi f3e8c2a4b6d1 da mavjud)
    op.execute(AUDIT_GUARD_FN)
    op.execute(
        "CREATE TRIGGER trg_audit_logs_append_only "
        "BEFORE UPDATE OR DELETE ON audit_logs "
        "FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only()"
    )

    # 4. Yangi xabar turi — ADD VALUE tranzaksiyadan tashqarida bajarilishi kerak
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'broadcast'")


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs")
    op.execute("DROP FUNCTION IF EXISTS audit_logs_append_only()")

    op.drop_index("ix_practice_assignments_source_assignment_id", table_name="practice_assignments")
    op.drop_constraint(
        "fk_practice_assignments_source_assignment_id",
        "practice_assignments",
        type_="foreignkey",
    )
    op.drop_column("practice_assignments", "source_assignment_id")

    op.drop_index("ix_broadcasts_sent_at", table_name="broadcasts")
    op.drop_index("ix_broadcasts_sender_id", table_name="broadcasts")
    op.drop_table("broadcasts")
    # PG enum qiymatini olib tashlab bo'lmaydi — 'broadcast' qoladi (zararsiz).
