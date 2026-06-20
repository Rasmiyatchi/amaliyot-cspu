"""departments + supervisor faculty/department + multi-org (M2M)

- departments (kafedra) jadvali
- supervisors.faculty_id, supervisors.department_id
- supervisor_organizations (M2M, supervizorga max 5 tashkilot)
- mavjud supervisors.organization_id qiymatlari M2M ga ko'chiriladi, keyin ustun drop

Revision ID: c1d3e5f7a9b2
Revises: b7f2c9a1e3d5
Create Date: 2026-06-20 18:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c1d3e5f7a9b2"
down_revision: Union[str, Sequence[str], None] = "b7f2c9a1e3d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─── departments (kafedra) ───────────────────────────────
    op.create_table(
        "departments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("faculty_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["faculty_id"], ["faculties.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("faculty_id", "name", name="uq_departments_faculty_name"),
    )
    op.create_index("ix_departments_faculty_id", "departments", ["faculty_id"])

    # ─── supervisors: faculty_id, department_id ──────────────
    op.add_column("supervisors", sa.Column("faculty_id", sa.Uuid(), nullable=True))
    op.add_column("supervisors", sa.Column("department_id", sa.Uuid(), nullable=True))
    op.create_index("ix_supervisors_faculty_id", "supervisors", ["faculty_id"])
    op.create_index("ix_supervisors_department_id", "supervisors", ["department_id"])
    op.create_foreign_key(
        "fk_supervisors_faculty_id", "supervisors", "faculties",
        ["faculty_id"], ["id"], ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_supervisors_department_id", "supervisors", "departments",
        ["department_id"], ["id"], ondelete="SET NULL",
    )

    # ─── supervisor_organizations (M2M) ──────────────────────
    op.create_table(
        "supervisor_organizations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("supervisor_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["supervisor_id"], ["supervisors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("supervisor_id", "organization_id", name="uq_supervisor_organization"),
    )
    op.create_index("ix_supervisor_organizations_supervisor_id", "supervisor_organizations", ["supervisor_id"])
    op.create_index("ix_supervisor_organizations_organization_id", "supervisor_organizations", ["organization_id"])

    # ─── mavjud organization_id ni M2M ga ko'chirish ─────────
    op.execute(
        """
        INSERT INTO supervisor_organizations (id, supervisor_id, organization_id, created_at, updated_at)
        SELECT gen_random_uuid(), id, organization_id, now(), now()
        FROM supervisors
        WHERE organization_id IS NOT NULL
        """
    )

    # ─── eski organization_id ustunini drop ──────────────────
    op.drop_column("supervisors", "organization_id")


def downgrade() -> None:
    op.add_column(
        "supervisors",
        sa.Column("organization_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "supervisors_organization_id_fkey", "supervisors", "organizations",
        ["organization_id"], ["id"], ondelete="SET NULL",
    )
    # M2M dagi birinchi tashkilotni qaytarib qo'yamiz
    op.execute(
        """
        UPDATE supervisors s
        SET organization_id = so.organization_id
        FROM (
            SELECT DISTINCT ON (supervisor_id) supervisor_id, organization_id
            FROM supervisor_organizations
            ORDER BY supervisor_id, created_at
        ) so
        WHERE so.supervisor_id = s.id
        """
    )
    op.drop_table("supervisor_organizations")
    op.drop_constraint("fk_supervisors_department_id", "supervisors", type_="foreignkey")
    op.drop_constraint("fk_supervisors_faculty_id", "supervisors", type_="foreignkey")
    op.drop_index("ix_supervisors_department_id", table_name="supervisors")
    op.drop_index("ix_supervisors_faculty_id", table_name="supervisors")
    op.drop_column("supervisors", "department_id")
    op.drop_column("supervisors", "faculty_id")
    op.drop_index("ix_departments_faculty_id", table_name="departments")
    op.drop_table("departments")
