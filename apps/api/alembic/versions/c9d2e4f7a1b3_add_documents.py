"""add documents table

Revision ID: c9d2e4f7a1b3
Revises: b8f1a2c5d6e7
Create Date: 2026-05-04 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c9d2e4f7a1b3"
down_revision: Union[str, Sequence[str], None] = "b8f1a2c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enum
    document_kind = postgresql.ENUM(
        "regulation", "program", name="document_kind", create_type=True
    )
    document_kind.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "kind",
            postgresql.ENUM(
                "regulation", "program", name="document_kind", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("practice_type_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("file_attachment", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["practice_type_id"], ["practice_types.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documents_kind", "documents", ["kind"])
    op.create_index("ix_documents_practice_type_id", "documents", ["practice_type_id"])
    op.create_index("ix_documents_created_by_id", "documents", ["created_by_id"])


def downgrade() -> None:
    op.drop_index("ix_documents_created_by_id", table_name="documents")
    op.drop_index("ix_documents_practice_type_id", table_name="documents")
    op.drop_index("ix_documents_kind", table_name="documents")
    op.drop_table("documents")
    op.execute("DROP TYPE IF EXISTS document_kind")
