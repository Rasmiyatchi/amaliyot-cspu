"""access_restrictions — foydalanuvchi/guruh uchun kirishni vaqtincha to'xtatish

Revision ID: d4f6b8c0e2a5
Revises: c3e5a7b9d1f4
Create Date: 2026-10-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d4f6b8c0e2a5"
down_revision: str | Sequence[str] | None = "c3e5a7b9d1f4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TARGET_VALUES = ("user", "group")
MODE_VALUES = ("maintenance", "restricted")


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM(*TARGET_VALUES, name="restriction_target", create_type=True).create(
        bind, checkfirst=True
    )
    postgresql.ENUM(*MODE_VALUES, name="restriction_mode", create_type=True).create(
        bind, checkfirst=True
    )
    target_ref = postgresql.ENUM(*TARGET_VALUES, name="restriction_target", create_type=False)
    mode_ref = postgresql.ENUM(*MODE_VALUES, name="restriction_mode", create_type=False)

    op.create_table(
        "access_restrictions",
        sa.Column("target_type", target_ref, nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("group_id", sa.Uuid(), nullable=True),
        sa.Column("mode", mode_ref, nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_by_id", sa.Uuid(), nullable=True),
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
            ["user_id"],
            ["users.id"],
            name="fk_access_restrictions_user_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["group_id"],
            ["groups.id"],
            name="fk_access_restrictions_group_id_groups",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            name="fk_access_restrictions_created_by_id_users",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_access_restrictions"),
    )
    op.create_index("ix_access_restrictions_user_id", "access_restrictions", ["user_id"])
    op.create_index("ix_access_restrictions_group_id", "access_restrictions", ["group_id"])


def downgrade() -> None:
    op.drop_index("ix_access_restrictions_group_id", table_name="access_restrictions")
    op.drop_index("ix_access_restrictions_user_id", table_name="access_restrictions")
    op.drop_table("access_restrictions")
    bind = op.get_bind()
    postgresql.ENUM(name="restriction_mode").drop(bind, checkfirst=True)
    postgresql.ENUM(name="restriction_target").drop(bind, checkfirst=True)
