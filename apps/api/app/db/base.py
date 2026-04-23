"""SQLAlchemy 2.0 Declarative Base + umumiy mixin'lar.

Barcha ORM modellari `Base` dan meros oladi.
`TimestampMixin` — created_at/updated_at avtomatik.
`UUIDMixin` — UUID primary key (string'larga qaraganda tezroq va xavfsizroq).
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, MetaData, func
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column

# Nomlash konvensiyasi — constraint'lar avto-nomlansin (Alembic uchun barqaror)
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)

    @declared_attr.directive
    def __tablename__(cls) -> str:  # noqa: N805
        """Class nomini snake_case + ko'plikka: User → users, PracticeType → practice_types."""
        import re

        name = re.sub(r"(?<!^)(?=[A-Z])", "_", cls.__name__).lower()
        # Oddiy ko'plik shakli — irregular so'zlar uchun model'da o'z __tablename__ belgilanadi
        if name.endswith("y"):
            return name[:-1] + "ies"
        if name.endswith("s"):
            return name + "es"
        return name + "s"


class UUIDMixin:
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
