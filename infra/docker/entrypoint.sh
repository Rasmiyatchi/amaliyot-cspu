#!/bin/sh
set -e

echo "=== CHDPU Backend Startup ==="

# 1. Wait for database to be ready
echo "1. Checking database connection..."
python - << 'EOF'
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def check():
    engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
    for attempt in range(1, 31):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            print("   Database is connected and ready.", flush=True)
            await engine.dispose()
            return True
        except Exception as err:
            reason = f"{type(err).__name__}: {err}".splitlines()[0][:300]
            print(f"   Database not ready yet (attempt {attempt}/30): {reason}", flush=True)
            await asyncio.sleep(1)
    await engine.dispose()
    return False

if not asyncio.run(check()):
    print("ERROR: Database connection timed out after 30 seconds!", file=sys.stderr)
    sys.exit(1)
EOF

# 2. Run Alembic migrations safely
echo "2. Applying database migrations (alembic upgrade head)..."
alembic upgrade head
echo "   Migrations successfully applied."

# 3. Start application server
echo "3. Starting Uvicorn server..."
if [ "$#" -eq 0 ]; then
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips=*
else
    exec "$@"
fi
