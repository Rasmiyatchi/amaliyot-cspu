# Tizim flow — texnik arxitektura

> CHDPU amaliyot platformasi qanday ishlaydi: request hayotiyligi, ma'lumot oqimi, integratsiyalar.

## 1. Yuqori darajadagi arxitektura

```
┌──────────────┐         ┌────────────────┐         ┌─────────────┐
│   Browser    │  HTTP   │   FastAPI      │  asyncpg│  Postgres   │
│  React+Vite  │◄───────►│   /api/v1/...  │◄───────►│    16       │
│  Zustand+TQ  │  cookie │   uvicorn      │         │             │
└──────────────┘  refresh└────────────────┘         └─────────────┘
                              │
                              ├──► WeasyPrint (PDF)
                              ├──► qrcode (QR)
                              ├──► Jinja2 (templates)
                              └──► storage/ filesystem (uploads + PDFs)
```

**Tahlilchi note**: hozircha Redis va Celery ishlatilmaydi — barcha vazifalar sync. Phase 14 deploy bilan WebSocket (Redis pub/sub) va Celery (PDF/email background) qo'shiladi.

## 2. Auth oqimi

```
┌────────┐                ┌────────┐                ┌─────┐
│Browser │  POST /login   │FastAPI │   verify       │  DB │
│        │───────────────►│        │───────────────►│     │
│        │                │ JWT    │                │     │
│        │  access(15m)   │ create │                │     │
│        │◄───────────────│        │                │     │
│        │  refresh(7d)   │ refresh│  insert hash   │     │
│        │  HttpOnly      │ token  │───────────────►│     │
│        │  cookie        │        │                │     │
└────────┘                └────────┘                └─────┘
```

- **Access token**: 15 daqiqa, JWT HS256, payload: `{sub, role, exp, jti, type}`. Memory (Zustand)'da, sahifa reload'ida yo'qoladi.
- **Refresh token**: 7 kun, SHA-256 hash DB'da, raw token HttpOnly cookie'da. Rotation: har refresh chaqiruvi yangi token chiqaradi va eskisini bekor qiladi.
- **Bootstrap**: sahifa reload'ida `useBootstrap()` hook `/auth/refresh` chaqiradi → muvaffaqiyat bo'lsa user store'ga yoziladi.
- **401 handling**: `lib/api.ts` ky hook 401'da avto-refresh urinib ko'radi, muvaffaqiyatsiz bo'lsa store tozalanadi va login'ga yo'naltirish.

## 3. Request lifecycle

```
1. ky.beforeRequest      → Authorization: Bearer <access_token>
2. CORS middleware       → origin tekshirish
3. Maintenance middleware→ super_admin emas + maintenance ON → 503
4. FastAPI route         → Depends(get_current_user) → require_role()
5. Service layer         → SQLAlchemy async query
6. asyncpg               → Postgres
7. Response              → Pydantic schema validation
8. ky.afterResponse      → 401 da refresh + retry
```

## 4. RBAC

| Rol | Asosiy huquqlar |
|---|---|
| **super_admin** | Hammasi + admin yaratish + system settings + override + maintenance bypass |
| **admin** | CRUD: students/supervisors/orgs/areas/assignments/contracts/tasks. Davomat boshqarish. Hisobotlar. |
| **supervisor** | O'z assignment'lariga: davomat tasdiqlash, task/journal/analysis approve/reject |
| **student** | O'z assignment'iga: check-in/out, task submit, journal/analysis yaratish, archive ZIP yuklab olish |

Implementatsiya: `app/api/deps.py` da `require_role([UserRole.X])` factory. Service layer'da `_check_student_owns()` va `_check_supervisor_owns()` mosligini tekshiradi.

## 5. Maintenance mode

```
super_admin /admin/system-settings → "Profilaktikani yoqish"
   ↓
PATCH /system-settings { maintenance_mode: true }
   ↓
DB update + cache invalidate
   ↓
Keyingi request (talaba/supervizor):
   MaintenanceMiddleware → DB SELECT (1 row, indexed)
   → maintenance_mode=true + user role != super_admin
   → 503 { code: "maintenance_mode", detail: message }
   ↓
Frontend (MaintenanceGuard yoki login):
   usePublicSettings (60s polling) → maintenance=true ko'radi
   → MaintenanceScreen full-screen splash
```

Allow-list (maintenance paytida ishlaydigan path'lar):
- `/`, `/docs`, `/redoc`, `/openapi.json`
- `/api/v1/health`
- `/api/v1/auth/*` — login/refresh/logout/me
- `/api/v1/system-settings/public` — banner uchun
- `/verify/*` — public QR verify

## 6. File upload oqimi

```
Browser → POST /uploads/entity/{kind}/{id}  (multipart, Bearer)
       ↓
   Validation:
     - size <= max_file_size_mb (system_settings)
     - extension ∈ allowed_file_types
     - RBAC: student o'ziniki, supervizor biriktirilgan, admin barchasi
       ↓
   Save to: storage/uploads/{YYYY}/{MM}/{ulid}.{ext}
       ↓
   Append to entity.attachments JSONB:
     { id, name, path, mime, size, uploaded_at, uploaded_by_id }
       ↓
   Return { attachment, all }
       ↓
   Browser → display in AttachmentsSection
```

Download:
```
Browser → GET /uploads/file/{path}  (Bearer)
       → svc.absolute_path() (path traversal himoyasi)
       → FileResponse(stream)
       → Browser blob → download trigger
```

## 7. Notifications oqimi

```
Backend trigger nuqtalari:
  task approve/reject     → notification_svc.create()
  journal approve/reject  → notification_svc.create()
  analysis approve/reject → notification_svc.create()
  attendance reject       → notification_svc.create()
  attendance override     → notification_svc.create()
       ↓
   INSERT INTO notifications (user_id, type, title, body, data, read_at=NULL)
       ↓
   Frontend bell (har 30s polling):
     GET /notifications/unread-count → badge
     GET /notifications → dropdown list
       ↓
   User clicks → POST /{id}/read → read_at update
```

Email/push **hozir yo'q** (Phase 14 SMTP).

## 8. Stats + polling

```
Frontend dashboard mount:
   useAdminStats() → GET /stats/admin (refetchInterval: 30000)
   useSupervisorStats() → GET /stats/supervisor
   useStudentStats() → GET /stats/student
       ↓
   Service:
     - count students, assignments, contracts
     - capacity_alerts: SELECT JOIN GROUP BY → severity
     - attendance_30d: aggregation
     - tasks_by_status, pending_reviews
       ↓
   Response: 5–8 KB JSON
       ↓
   Frontend: KPI cards + alerts
```

Real-time o'rniga 30s polling. Demo uchun yetadi. Phase 14 da WebSocket bilan almashtiriladi.

## 9. Archive ZIP generatsiya

```
Trigger: GET /assignments/{id}/archive.zip (student/supervizor/admin)
   ↓
1. _load_assignment_context() — student + assignment + org + supervisor
2. _load_stats() — attendance %, tasks ball, journal/analysis counts, contract
3. WeasyPrint render PDF (4 ta):
   - cover.html → 00-hisobot.pdf (umumiy stats jadvali)
   - journal.html → 01-kundalik.pdf (barcha entries)
   - analyses.html → 02-dars-tahlillari.pdf
   - tasks.html → 03-topshiriqlar.pdf (semestr × kategoriya bo'yicha grouped)
4. Agar shartnoma bor:
   - 04-shartnoma-{number}.pdf (avval generated)
   - 05-shartnoma-skan.{ext} (agar yuklangan)
5. zipfile.ZipFile in-memory → Response(application/zip)
```

## 10. Storage layout

```
apps/api/storage/
├── contracts/
│   ├── {contract_id}.pdf      # generated
│   └── scans/
│       └── {contract_id}.{ext}  # uploaded scan
└── uploads/
    └── {YYYY}/
        └── {MM}/
            └── {ulid}.{ext}    # task/journal/analysis attachments
```

Production'da S3/MinIO ga migratsiya qilinadi (Phase 14+).

## 11. DB sxema asosiy entity'lar

```
User ──┬─► Student
       ├─► Supervisor
       └─► (admin/super_admin uchun alohida profil yo'q)

Faculty → Direction → Group → Student

Organization ─┐
              ├─► PracticeAssignment ◄── Student, PracticeType, AcademicYear, Supervisor (optional)
Area ─────────┘                          │
                                         ├─► AttendanceDay → AttendanceEvent + AttendanceOverride
                                         ├─► Task ◄── TaskTemplate (43 ta seed)
                                         ├─► JournalEntry
                                         └─► LessonAnalysis

Contract: 1 organization, N students (JSONB snapshot, assignment_id reference)

Notification ──► User (FK)

SystemSettings: singleton row (1 ta yozuv)
```

## 12. Konfiguratsiya

`.env` o'zgaruvchilari (env.example'da):
- `DATABASE_URL` — postgresql+asyncpg://...
- `REDIS_URL` — redis://localhost:6379 (hozirgacha ishlatilmaydi)
- `JWT_SECRET` — random 32+ byte
- `JWT_ACCESS_TTL_MINUTES` — 15
- `JWT_REFRESH_TTL_DAYS` — 7
- `SUPERADMIN_USERNAME/PASSWORD/EMAIL` — birinchi seed uchun
- `APP_ENV` — development/production
- `APP_DEBUG` — True/False (docs ko'rinish)
- `CORS_ORIGINS` — comma-separated

## 13. Ishga tushirish

```bash
# Backend (port 8000)
cd apps/api && pnpm dev
# yoki: DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib uv run uvicorn app.main:app --reload

# Frontend (port 5173)
cd apps/web && pnpm dev

# Yoki ikkalasi parallel root'dan:
pnpm dev
```

Migratsiya:
```bash
cd apps/api && uv run alembic upgrade head
```

Test login'lar (seed dan):
- Super admin: `superadmin` / `SuperSecret123!`
- Talaba: `354231100489` / `AD0193680` (HEMIS id + passport)
- Supervizor: `azizovadd` / `test1234` (manual reset qilingan)
