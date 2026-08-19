import asyncio
from sqlalchemy import text
from app.db.session import SessionLocal

async def inspect():
    async with SessionLocal() as session:
        result = await session.execute(
            text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
            """)
        )
        tables = [row[0] for row in result.fetchall()]
        print(f"Found {len(tables)} tables:")
        for t in tables:
            count_res = await session.execute(text(f'SELECT COUNT(*) FROM "{t}"'))
            count = count_res.scalar()
            print(f"  - {t}: {count} rows")

if __name__ == "__main__":
    asyncio.run(inspect())
