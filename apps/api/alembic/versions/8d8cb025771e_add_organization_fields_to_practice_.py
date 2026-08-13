"""Ariza-shartnoma tizimi: shablon statusi + ariza tashkilot maydonlari

Revision ID: 8d8cb025771e
Revises: a1b2c3d4e5f6
Create Date: 2026-08-06

Qo'lda qayta yozilgan (asl autogenerate dump jonli bazada yiqilardi):
  - NOT NULL ustunlar endi server_default + backfill bilan qo'shiladi.
  - organization_kind PG tipi prod'da ALLAQACHON bor (26d10d3f1e65) —
    yangi qiymatlar ALTER TYPE ADD VALUE bilan qo'shiladi (PG12+ da
    tranzaksiya ichida xavfsiz, chunki shu migratsiyada ishlatilmaydi).
  - contract_templates.is_active ma'lumoti yangi status ustuniga ko'chiriladi
    (true -> active, false -> inactive), keyin ustun o'chiriladi.
  - Asl dump'dagi begona drift (ix_audit_logs_created_at drop, server_default
    strip'lar, comment churn) OLIB TASHLANDI.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "8d8cb025771e"
down_revision: str | Sequence[str] | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Enum tiplar ──
    # Yangi tip — prod'da yo'q, yaratamiz
    contract_template_status = postgresql.ENUM(
        "draft", "active", "inactive", "archived",
        name="contract_template_status",
        create_type=False,
    )
    contract_template_status.create(op.get_bind(), checkfirst=True)

    # Mavjud tipga yangi qiymatlar (PG12+ tranzaksiyada ruxsat — bu migratsiyada
    # bu qiymatlar hech qayerga YOZILMAYDI, shuning uchun xavfsiz)
    op.execute("ALTER TYPE organization_kind ADD VALUE IF NOT EXISTS 'state_organization'")
    op.execute("ALTER TYPE organization_kind ADD VALUE IF NOT EXISTS 'private_organization'")

    # ── contract_templates: is_active -> status ──
    op.add_column(
        "contract_templates",
        sa.Column(
            "status",
            postgresql.ENUM(name="contract_template_status", create_type=False),
            nullable=False,
            server_default="draft",
        ),
    )
    op.execute(
        """
        UPDATE contract_templates
        SET status = CASE WHEN is_active THEN 'active'::contract_template_status
                          ELSE 'inactive'::contract_template_status END
        """
    )
    op.create_index(
        op.f("ix_contract_templates_status"), "contract_templates", ["status"]
    )
    op.drop_column("contract_templates", "is_active")

    # ── practice_applications: tashkilot maydonlari ──
    op.add_column(
        "practice_applications",
        sa.Column(
            "organization_type",
            postgresql.ENUM(name="organization_kind", create_type=False),
            nullable=False,
            server_default="other",
        ),
    )
    op.add_column(
        "practice_applications",
        sa.Column(
            "organization_name",
            sa.String(length=500),
            nullable=False,
            server_default="",
        ),
    )
    # Eski arizalarda tashkilot nomi object_name da edi — ko'chiramiz
    op.execute(
        """
        UPDATE practice_applications
        SET organization_name = COALESCE(object_name, '')
        WHERE organization_name = ''
        """
    )
    op.add_column(
        "practice_applications",
        sa.Column("template_version", sa.Integer(), server_default="1", nullable=False),
    )
    op.add_column(
        "practice_applications",
        sa.Column("return_reason", sa.Text(), nullable=True),
    )
    # Eski majburiy maydonlar endi shablon-asosli oqimda ixtiyoriy
    op.alter_column(
        "practice_applications", "object_name",
        existing_type=sa.VARCHAR(length=300), nullable=True,
    )
    op.alter_column(
        "practice_applications", "object_location",
        existing_type=sa.VARCHAR(length=500), nullable=True,
    )
    op.alter_column(
        "practice_applications", "manager_phone",
        existing_type=sa.VARCHAR(length=32), nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "practice_applications", "manager_phone",
        existing_type=sa.VARCHAR(length=32), nullable=False,
    )
    op.alter_column(
        "practice_applications", "object_location",
        existing_type=sa.VARCHAR(length=500), nullable=False,
    )
    op.alter_column(
        "practice_applications", "object_name",
        existing_type=sa.VARCHAR(length=300), nullable=False,
    )
    op.drop_column("practice_applications", "return_reason")
    op.drop_column("practice_applications", "template_version")
    op.drop_column("practice_applications", "organization_name")
    op.drop_column("practice_applications", "organization_type")

    op.add_column(
        "contract_templates",
        sa.Column(
            "is_active", sa.BOOLEAN(), server_default=sa.text("true"), nullable=False
        ),
    )
    op.execute(
        "UPDATE contract_templates SET is_active = (status = 'active'::contract_template_status)"
    )
    op.drop_index(op.f("ix_contract_templates_status"), table_name="contract_templates")
    op.drop_column("contract_templates", "status")
    postgresql.ENUM(name="contract_template_status").drop(op.get_bind(), checkfirst=True)
    # organization_kind tipini O'CHIRMAYMIZ — organizations.kind hali ishlatadi.
    # Qo'shilgan enum qiymatlarini PG olib tashlay olmaydi — zararsiz qoladi.
