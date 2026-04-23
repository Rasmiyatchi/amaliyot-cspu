"""Async SQLAlchemy engine, session factory va FastAPI dependency.

Ishlatish (routerlarda):
    from app.db.session import SessionDep

    @router.get("/foo")
    async def handler(db: SessionDep) -> ...:
        result = await db.execute(select(Foo))
"""

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.APP_DEBUG,
    pool_pre_ping=True,  # dead connection'lar avtomatik tozalanadi
    pool_size=10,
    max_overflow=20,
)

SessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # commit'dan keyin ob'ektlar qayta yuklanmaydi
    autoflush=False,
)


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency — har request uchun yangi session."""
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


SessionDep = Annotated[AsyncSession, Depends(get_db)]
