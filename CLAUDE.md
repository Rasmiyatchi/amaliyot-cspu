# CHDPU Amaliyot Platformasi — Claude Guide

> Bu fayl Claude uchun loyiha bo'yicha asosiy yo'riqnoma. Har bir yangi sessiya avtomatik yuklanadi.

## Loyiha maqsadi

Chirchiq Davlat Pedagogika Universiteti (CHDPU) talabalarining barcha turdagi amaliyotlarini (4+2, malakaviy, pedagogik, dala, botanika, zoologiya, plener) raqamlashtiruvchi zamonaviy platforma. HEMIS bilan integratsiyalashgan, geolokatsiyaga asoslangan davomat, QR-kodli elektron shartnoma, 100-ballik sillabus asosida baholash va yig'ma jild PDF/ZIP eksportini ta'minlaydi.

**Foydalanuvchi rollari**: Super Admin · Admin · Supervizor (korxona rahbari) · Talaba

## Tech Stack

### Monorepo
pnpm workspaces + Turborepo (build caching)

### Frontend — `apps/web`
- React 18 + Vite + TypeScript (strict mode)
- Tailwind CSS + shadcn/ui (Radix asosida)
- TanStack Query (server state), Zustand (client state)
- React Router v7, React Hook Form + Zod
- Framer Motion, Recharts/Tremor
- i18n: `react-i18next` (uz default; ru, en keyinroq)
- PWA (Vite PWA plugin) — offline davomat uchun

### Backend — `apps/api`
- FastAPI + Uvicorn (async)
- SQLAlchemy 2.0 async + Alembic (migrations)
- Pydantic v2 (validation), Pydantic Settings (config)
- PostgreSQL 16 (asosiy DB)
- Redis 7 (cache, pub/sub, Celery broker)
- Celery (background jobs: PDF gen, email, HEMIS sync)
- JWT (access + refresh) + RBAC (casbin yoki custom)
- Python-jose, passlib[bcrypt]
- WeasyPrint (PDF generatsiya), `qrcode` (QR kodlar)
- Loguru (structured logging)
- pytest + httpx (testing)

### Storage (hozircha)
Local filesystem `apps/api/storage/` — keyinroq MinIO/S3 ga migratsiya

### DevOps
Docker + Docker Compose (dev va prod) + GitHub Actions CI/CD + Ubuntu VPS + Nginx + Certbot

## Repo strukturasi

```
InternshipCHDPU/
├── apps/
│   ├── web/                 # React + Vite + TS
│   └── api/                 # FastAPI
│       ├── app/
│       │   ├── core/        # config, security, deps
│       │   ├── db/          # session, base, migrations
│       │   ├── models/      # SQLAlchemy models
│       │   ├── schemas/     # Pydantic schemas
│       │   ├── api/         # routers (v1/)
│       │   ├── services/    # business logic
│       │   ├── workers/     # Celery tasks
│       │   └── main.py
│       └── tests/
├── packages/
│   ├── types/               # OpenAPI → TS types
│   └── tsconfig/
├── infra/
│   ├── docker/              # Dockerfiles
│   ├── compose/             # docker-compose.{dev,prod}.yml
│   └── nginx/               # reverse proxy configs
├── docs/                    # ARCH, ERD, API notes
├── backend_old/             # ESKI (reference only, DON'T MODIFY)
├── frontend_old/            # ESKI (reference only, DON'T MODIFY)
├── .claude/                 # Claude Code settings, subagents
├── CLAUDE.md                # Bu fayl
├── PLAN.md                  # Milestone plan
├── ARCHITECTURE.md          # Domain model, ERD, decisions
└── README.md
```

## Domain bounded contexts

1. **Identity** — auth, users, RBAC, sessions
2. **Academic** — faculty, department, group, direction/specialty, course; HEMIS sync
3. **Practice** — 8 xil amaliyot turi (polymorphic), lifecycle, syllabus rules
4. **Placement** — shartnoma, obyekt (organization yoki area), supervizor biriktirish
5. **Attendance** — check-in/out, geo-fence, wifi, qizil/yashil status
6. **Assessment** — topshiriqlar, kundalik, dars tahlili, 100-ballik baholash
7. **Documents** — QR shartnoma PDF, yig'ma jild (ZIP/PDF export)
8. **Notifications** — real-time WebSocket, email, push

## 8 xil amaliyot turi (TZ + sillabus)

| # | Nomi | Muddati | Shartnoma | Obyekt turi | Kurslar |
|---|---|---|---|---|---|
| 1 | 4+2 (umumiy) | 30 hafta (kuz+bahor) | ✅ | maktab | 2-4 |
| 2 | 4+2 (MTT/maxsus) | 30 hafta | ✅ | MTT | 2-4 |
| 3 | Malakaviy (dala) | 1-2 hafta | ❌ | hudud | 1-2 |
| 4 | Malakaviy (zoologiya) | 1-2 hafta | ❌ | hudud | 1-2 |
| 5 | Malakaviy (botanika) | 1-2 hafta | ❌ | hudud | 1-2 |
| 6 | Plener | 1-4 hafta | ❌ | hudud | 1-2 |
| 7 | Pedagogik | 2-15 hafta | ✅ | maktab/tashkilot | bitiruvchi |
| 8 | Malakaviy (umumiy) | 1-8 hafta | ✅ | maktab/tashkilot | barcha |

Amaliyot turlari `practice_types` jadvalida konfiguratsiya sifatida saqlanadi — `requires_contract`, `min_weeks`, `max_weeks`, `object_type`, `grading_rules` (JSONB).

## Baholash (4+2 sillabus misolida)

100 ballik tizim, minimum 60 ball — kredit olish uchun.

| Mezon | Ball | Kim baholaydi |
|---|---|---|
| Davomat | 10 | Avto (tizim) |
| Tadbirlar ishtiroki | 20 | Maktab rahbariyati |
| O'quv topshiriqlar | 60 | Amaliyot rahbari |
| Hisobot himoyasi | 10 | Kafedra mudiri |

Davomat formulasi: 90-100% → 10 ball · 70-80% → 5 · 60-70% → 3 · <60% → 0

## Shartnoma oqimi

```
Talaba ma'lumot kiritadi
  → Universitet (Admin) tasdiq
  → Qabul qiluvchi (Supervizor) tasdiq + skan yuklaydi
  → PDF generatsiya (QR kod bilan)
  → qr.chdpu.uz/v/{token} orqali ommaviy tekshirish
  → Status: active | expired | revoked
```

## Davomat oqimi

- Talaba "Kelish" bosadi → geo-fence yoki WiFi SSID tekshiriladi
- Tizim vaqtni fiksatsiya qiladi
- "Ketish" bosilganda yakunlanadi
- Supervizor tasdiqlaydi
- Dars qoldirilsa avto "Qizil" (red)
- **Faqat Super Admin** asosli sabab bilan "Qizil" → "Yashil" o'tkazadi

## Manba hujjatlar (loyiha rootida)

- [TZ.txt](TZ.txt) — texnik topshiriq
- `2025-2026 o'quv yil  4+2 amalyot shartnomasi.pdf` — 4+2 shartnoma shabloni
- `2025-2026 o'quv yil  pedagogik amalyot shartnomasi.pdf` — pedagogik shablon
- `Shartnoma_8490_20260324_131540.pdf` — imzolangan shartnoma namunasi
- `4+2 amaliyot sillabusi.pdf` — baholash mezonlari, topshiriqlar
- `Malakaviy amaliyot ishlab chiqarish.pdf` — ishlab chiqarish amaliyoti shabloni
- `Tanishtiruv malakaviy amaliyot. sirtqi.pdf` — sirtqi tanishtiruv amaliyoti

PDF o'qish uchun: `pdftotext -layout <file>.pdf <out>.txt`

## Kod konvensiyalari

### Backend (Python)
- Ruff (lint + format) + mypy (strict)
- snake_case funksiya/o'zgaruvchilar, PascalCase classlar
- Async as default (db, IO, external calls)
- Repository pattern: `services/` — business logic, `crud/` — DB queries
- Pydantic schema nomlash: `XyzCreate`, `XyzUpdate`, `XyzRead`, `XyzInDB`
- API versioning: `/api/v1/...`

### Frontend (TypeScript)
- ESLint + Prettier
- Strict TS, no `any`
- PascalCase componentlar, camelCase hooklar
- Server state → TanStack Query; client state → Zustand
- Forms: React Hook Form + Zod resolver
- i18n keys: `namespace.key` (masalan `auth.login.submit`)
- Fayllar: `ComponentName.tsx` (component), `useXyz.ts` (hook), `xyz.types.ts` (types)

### Git
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Feature branches: `feat/<short-name>`
- PR oldin: lint + test yashil

## Muhim eslatmalar Claude uchun

- `backend_old/` va `frontend_old/` — **faqat reference**. Hech qachon o'zgartirma. Agar mantiq yoki dizayn g'oyasi kerak bo'lsa, o'qi va yangi kodga moslashtirib ko'chir.
- Barcha UI matnlar **o'zbek tilida** (asosiy). i18n uz.json birinchi, keyin ru.json, en.json.
- API xatoliklar standart format: `{ "detail": "...", "code": "...", "field_errors": {} }`
- Yangi model/schema qo'shganda: Alembic migration + Pydantic schema + OpenAPI sync + frontend types regen.
- Production secret'lar `.env` da, git ga tushmasin (`.env.example` commit qilinadi).
- HEMIS ma'lumotlari shaxsiy — logs da JSHSHIR, passport seriya chiqmasin.

## Useful commands (keyinroq to'ldiriladi)

```bash
# Backend
cd apps/api && uvicorn app.main:app --reload
alembic revision --autogenerate -m "msg"
alembic upgrade head
pytest

# Frontend
pnpm --filter web dev
pnpm --filter web build

# Full stack (Docker)
docker compose -f infra/compose/docker-compose.dev.yml up

# OpenAPI → TS types regen
pnpm types:sync
```
