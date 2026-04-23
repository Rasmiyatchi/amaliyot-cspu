"""add practice_types table

Revision ID: 416634289e9b
Revises: 3d0654406508
Create Date: 2026-04-23 22:24:49.351132

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "416634289e9b"
down_revision: Union[str, Sequence[str], None] = "3d0654406508"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # create_table sa.Enum'ni o'zi yaratadi — explicit create kerak emas

    op.create_table(
        "practice_types",
        sa.Column(
            "code",
            sa.String(length=64),
            nullable=False,
            comment="Masalan '4_plus_2_school', 'field_zoology'",
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("requires_contract", sa.Boolean(), nullable=False),
        sa.Column(
            "contract_template_ref",
            sa.String(length=64),
            nullable=True,
            comment="'4_plus_2' | 'pedagogical' | 'qualifying' | null",
        ),
        sa.Column(
            "object_kind",
            sa.Enum("organization", "area", "any", name="object_kind"),
            nullable=False,
        ),
        sa.Column("min_weeks", sa.Integer(), nullable=False),
        sa.Column("max_weeks", sa.Integer(), nullable=False),
        sa.Column("days_per_week", sa.Integer(), nullable=True),
        sa.Column("hours_per_day", sa.Integer(), nullable=True),
        sa.Column(
            "allowed_courses",
            sa.ARRAY(sa.Integer()),
            server_default="{}",
            nullable=False,
            comment="Masalan {2,3,4} yoki {1,2}",
        ),
        sa.Column(
            "grading_rules",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
            comment="{min_total, criteria: [{key, name, max, grader}]}",
        ),
        sa.Column("syllabus_md", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("display_order", sa.Integer(), server_default="0", nullable=False),
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
        sa.PrimaryKeyConstraint("id", name=op.f("pk_practice_types")),
    )
    op.create_index(op.f("ix_practice_types_code"), "practice_types", ["code"], unique=True)
    # (uq_academic_years_active false positive — saqlab qolamiz)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_practice_types_code"), table_name="practice_types")
    op.drop_table("practice_types")
    sa.Enum(name="object_kind").drop(op.get_bind(), checkfirst=False)
