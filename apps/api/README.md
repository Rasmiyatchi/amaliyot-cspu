# apps/api — FastAPI backend

## Pre-req

- Python 3.12+ (3.14 test qilingan)
- [uv](https://docs.astral.sh/uv/) — Python paket menejeri
- PostgreSQL 17 (brew services'da ishlab turishi kerak)
- Redis (brew services'da ishlab turishi kerak)

## Birinchi ishga tushirish

```bash
# 1. Deps (avtomatik .venv/ yaratadi)
uv sync

# 2. .env yaratish
cp ../../.env.example .env
# kerak bo'lsa tahrirlang

# 3. DB migratsiyalar
pnpm migrate           # yoki: uv run alembic upgrade head

# 4. Dev serverni ishga tushirish
pnpm dev               # yoki: uv run uvicorn app.main:app --reload
```

Ochish:
- http://localhost:8000/api/v1/health
- http://localhost:8000/api/v1/db-health
- http://localhost:8000/docs (Swagger UI)
- http://localhost:8000/redoc

## Struktura

```
app/
  main.py              # FastAPI instance
  core/
    config.py          # Pydantic Settings
    logging.py         # Loguru
  db/
    base.py            # DeclarativeBase + UUID/Timestamp mixinlar
    session.py         # Async engine + SessionDep
  api/
    v1/
      __init__.py      # Router aggregator
      health.py        # /health, /db-health

alembic/
  env.py               # Alembic config (bizning settings'ga bog'langan)
  versions/            # Migration fayllari
  script.py.mako       # Yangi migration shabloni

tests/                 # pytest
storage/               # Upload'lar (gitignored)
```

## Scripts (pnpm yoki uv run)

| Script | Nima qiladi |
|---|---|
| `pnpm dev` | Dev server (hot reload) |
| `pnpm start` | Production server |
| `pnpm test` | pytest |
| `pnpm lint` | ruff check |
| `pnpm format` | ruff format |
| `pnpm typecheck` | mypy strict |
| `pnpm migrate` | `alembic upgrade head` |
| `pnpm migrate:down` | `alembic downgrade -1` (bir pog'ona orqaga) |
| `pnpm migrate:new "msg"` | Yangi migration yaratish (autogenerate) |
| `pnpm migrate:status` | Joriy va bosh migration'larni ko'rsatish |

## Alembic workflow

Model qo'shganda:

1. `app/models/xyz.py` da yangi model yozing (Base'dan meros)
2. `app/models/__init__.py` da import qiling (autogenerate ko'rishi uchun)
3. `pnpm migrate:new "add xyz table"`
4. `alembic/versions/` da yaratilgan faylni **ko'zdan kechiring** (autogenerate ba'zida adashadi)
5. `pnpm migrate` — migration'ni qo'llash
