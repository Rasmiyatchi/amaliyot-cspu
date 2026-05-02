# PLAN — Bosqichma-bosqich qurilish rejasi

> Har bir milestone demoable bo'lishi kerak. Katta milestone kichik task'larga bo'linadi.
> Tartib muhim: keyingi milestone oldingisiga tayanadi.

## Umumiy prinsiplar

1. **Vertical slice** — har bir milestone: DB model + API + UI to'liq ishlaydi
2. **Ship early, ship often** — xususiyat 80% tayyor bo'lsa merge, keyin polish
3. **Test qilib o'tamiz** — critical path pytest + Playwright
4. **Type safety** — OpenAPI dan TS tiplar avto-gen; frontend da hech qachon `any` yo'q
5. **Dokumentatsiya kod bilan birga** — yangi endpoint → Swagger ga yoziladi

---

## PHASE 0 — Foundation (1 hafta)

### M0.1 · Monorepo skelet

- [X] `pnpm init` + workspaces
- [X] `apps/web`: Vite + React + TS + Tailwind init
- [X] `apps/api`: FastAPI skelet (`app/main.py`, `app/core/config.py`)
- [X] `packages/types` placeholder
- [X] Root `.gitignore`, `.editorconfig`, `.nvmrc`, `.python-version`
- [X] Pre-commit hooks (ruff, eslint, prettier)

### M0.2 · Local servislar (Postgres + Redis) ✨ _revised_

> ℹ️ Workflow qarori (2026-04-23): local'da Docker ishlatilmaydi. Faqat deploy'da.

- [X] `brew install postgresql@16 redis`
- [X] `brew services start postgresql@16` va `redis`
- [X] DB yaratish: `chdpu_dev`, user `chdpu`
- [X] `.env.example` (local uchun localhost:5432 va localhost:6379)
- [X] Docker Compose **prod uchun** keyinroq (Phase 14 — Deploy)

### M0.3 · DB skelet + Alembic

- [X] SQLAlchemy 2.0 async engine + session factory
- [X] Alembic konfiguratsiya (`alembic.ini`, `env.py`)
- [X] Birinchi migration: `users` minimal

### M0.4 · Base FastAPI app

- [X] Health check `/api/v1/health`
- [X] CORS middleware, request ID, log format
- [X] Global exception handler (detail + code)
- [X] OpenAPI docs `/docs`, `/redoc`

### M0.5 · Base React app

- [X] Tailwind + CSS variables (light/dark tokens)
- [X] shadcn/ui o'rnatish va 5 ta base component (Button, Input, Dialog, Card, Toast)
- [X] Router setup (protected + public routes)
- [X] API client (axios/ky) + TanStack Query provider
- [X] Theme provider (light/dark toggle)

**Demo**: `docker compose up` → https://localhost:5173 ochiladi, light/dark toggle ishlaydi, `/api/v1/health` qaytadi.

---

## PHASE 1 — Auth & RBAC (1 hafta)

### M1.1 · User model + migrations

- [X] `User` model: id, username, email, phone, password_hash, role, is_active, timestamps
- [X] `Role` enum: super_admin, admin, supervisor, student
- [X] `RefreshToken` model (rotating)
- [X] Seed: 1 super_admin (ENV dan)

### M1.2 · Auth endpoints

- [X] `POST /auth/login` → access (15min) + refresh (7kun HttpOnly cookie)
- [X] `POST /auth/refresh`
- [X] `POST /auth/logout`
- [X] `GET /auth/me`
- [X] `POST /auth/change-password`

### M1.3 · RBAC middleware

- [X] `Depends(require_role([...]))` dependency
- [X] Audit log model (who did what, when)

### M1.4 · Login UI

- [X] Login page (username/email + password)
- [X] AuthContext + persistence (refresh token cookie)
- [X] Protected route wrapper
- [X] Role-based landing redirect

**Demo**: login → rol bo'yicha /super-admin, /admin, /supervisor, /student marshrutlariga yo'naltirish; token refresh avtomatik.

---

## PHASE 2 — Academic Structure (0.5 hafta)

### M2.1 · Academic models

- [X] `Faculty`, `Department`, `Direction` (specialty code + nomi), `Group`, `AcademicYear`, `Semester`
- [X] `Student` profile: user_id, faculty, department, direction, group, course, hemis_id, jshshir

### M2.2 · HEMIS import (manual Excel)

- [X] `POST /admin/hemis/import` (Excel upload)
- [X] pandas bilan parse, validation, bulk insert
- [X] Avtomatik parol generatsiya → ro'yxat export

### M2.3 · Admin UI: Academic

- [X] Faculty/Department/Direction CRUD tables
- [X] Student list (filter: faculty, course, group, direction)
- [X] HEMIS import modal + progress

**Demo**: Admin Excel yuklaydi → talabalar tizimda paydo bo'ladi, login qila oladilar.

---

## PHASE 3 — Practice Types Config (0.5 hafta)

### M3.1 · PracticeType catalog

- [X] `PracticeType` model (code, name, requires_contract, object_type, min_weeks, max_weeks, allowed_courses, grading_rules JSONB, syllabus_md)
- [X] Seed 8 ta standart tur (TZ ga mos)

### M3.2 · Super Admin UI

- [X] Practice Type table + edit modal (JSON grading rules visual editor keyinroq)

**Demo**: 8 ta amaliyot turi tizimda mavjud, sozlanuvchi.

---

## PHASE 4 — Organizations & Areas (1 hafta)

### M4.1 · Obyekt modellar

- [X] `Organization`: nomi, director F.I.SH., manzil, telefon, INN, bank rekvizitlari, capacity, work_days (JSONB), work_hours
- [X] `Area` (hudud, shartnomasiz): nomi, tavsif, region, geo_bounds (GeoJSON)
- [X] `Supervisor` profile: user_id, organization_id, position, capacity, specialty

### M4.2 · Admin UI

- [X] Organizations table + form (shartnoma shabloniga mos maydonlar)
- [X] Areas table + mini map (Leaflet + OSM)
- [X] Supervisors table (organization'ga biriktirilgan)

**Demo**: Admin maktab qo'shadi, supervizor qo'shadi; hudud qo'shadi ("Chimyon tog'i") xaritada ko'rinadi.

---

## PHASE 5 — Student Assignment (0.5 hafta)

### M5.1 · Assignment logic

- [X] `PracticeAssignment` (= eski Internship ning o'rnida): student, practice_type, organization yoki area, supervisor, start, end, status
- [X] Capacity tekshirish, duplicate oldini olish
- [X] Bulk assignment (guruh → organization)

### M5.2 · Admin UI

- [X] "Amaliyot biriktirish" wizard: practice type tanlash → talabalar tanlash → obyekt tanlash → sana → tasdiqlash

**Demo**: Admin guruh talabalarini 4+2 bo'yicha maktabga biriktiradi.

---

## PHASE 6 — Contract (QR) — CRITICAL (1.5 hafta)

### M6.1 · Contract model + template engine

- [X] `Contract` model: number (avto), type, parties, students_json, start, end, status, pdf_path, qr_token
- [X] Jinja2 template + WeasyPrint (3 shablon: 4+2, pedagogik, malakaviy)
- [X] QR kod URL: `{PUBLIC_URL}/verify/{qr_token}`

### M6.2 · Workflow

- [X] Talaba: shartnoma formasini to'ldiradi → `student_submitted`
- [X] Supervizor: ko'radi, tasdiqlaydi → `org_approved`
- [X] Admin: tasdiqlaydi → PDF gen + QR → `active`
- [X] Skan yuklash (supervizor fizik imzolagan versiyasi)

### M6.3 · Public verification

- [X] `GET /verify/{token}` (noauth) → status + metadata
- [X] Rate limit

### M6.4 · UI

- [X] Talaba: shartnoma formasi + status tracker
- [X] Admin: moderation queue
- [X] PDF preview + download

**Demo**: To'liq shartnoma oqimi (talaba → supervizor → admin → QR PDF) va public QR tekshirish.

---

## PHASE 7 — Attendance (2 hafta)

### M7.1 · Models

- [X] `AttendanceDay` (per assignment + date, status: pending/green/red, note)
- [X] `AttendanceEvent` (check_in, check_out, lat/lng, accuracy, wifi_ssid, device_id)
- [X] `AttendanceOverride` (qizil → yashil, super admin id, reason)

### M7.2 · Geo-fence logic

- [X] Organization.geo_point + radius yoki geo_polygon
- [X] Talaba check-in: masofa tekshirish (haversine)
- [X] Optional: WiFi SSID whitelist
- [X] Agar masofa tashqarida: rad etish yoki "flagged" status

### M7.3 · Auto red logic (background)

- [X] Celery periodic: kun oxirida check-in bo'lmagan qilinsa red
- [X] Dam olish kunlari bilan hisoblash (organization.work_days)

### M7.4 · UI

- [X] Talaba: check-in/out katta tugma + xarita
- [X] Supervizor: kunlik ro'yxat + tasdiqlash
- [X] Super Admin: qizil→yashil override (reason majburiy)

**Demo**: Talaba maktabga boradi, check-in qiladi; supervizor tasdiqlaydi; dars qoldirgani red bo'ladi, Super Admin yashilga o'tkazadi.

---

## PHASE 8 — Tasks, Reports, Daily Journal (2 hafta)

### M8.1 · Syllabus-based task catalog

- [X] `TaskTemplate`: practice_type, course, semester, title, points, deadline_rule (e.g. "oktabr oxiri"), type (dars_tahlili | esse | tadbir_ssenariy | rejish | ochiq_dars | sinov_dars | ...)
- [X] Seed 4+2 sillabusidan barcha tasklar

### M8.2 · Student instance

- [X] `Task`: assignment'dan `TaskTemplate` bo'yicha instance, status, submission, grader, grade
- [X] Yaratilganda deadline avto

### M8.3 · Daily journal (kundalik)

- [X] `JournalEntry`: date, content_md, attachments[], status
- [X] Supervizor ko'rib tasdiqlaydi

### M8.4 · Lesson analysis (dars tahlili)

- [X] `LessonAnalysis`: date, subject, teacher, analysis_md, files[]
- [X] Kvota tekshirish (har chorakda N ta)

### M8.5 · UI

- [X] Talaba: task list + kundalik + yangi dars tahlili
- [X] Supervizor/Admin: tekshirish UI + baho
- [X] Rejection reason + revision loop

**Demo**: Talaba kundalik va dars tahlilini yuklaydi; supervizor baholaydi.

---

## PHASE 9 — 100-ball Grading (1 hafta) — **KEYINGA QOLDIRILGAN**

> ⚠️ Foydalanuvchi qarori (2026-04-23): Ball tizimi hozir qilinishi shart emas.
> MVP uchun talaba/supervizor oqimi to'liq ishlagandan keyin qaytamiz.
> Tasks va hisobotlar yuklanadi, lekin yakuniy 100-ball hisobi keyin.

### M9.1 · Scoring engine

- [X] `GradeBreakdown`: assignment bo'yicha criterion (davomat/tadbirlar/topshiriqlar/hisobot) → points
- [X] Har mezon uchun grader rol (config)
- [X] Final = sum, kredit = final >= 60

### M9.2 · UI

- [X] Supervizor: tadbirlar + topshiriqlar ball
- [X] Kafedra mudiri (admin rol): hisobot himoyasi
- [X] Talaba: progress bar, breakdown ko'rish
- [X] Admin: umumiy grade table + export

**Demo**: Har talaba uchun 4 mezon bo'yicha ball yig'iladi, avtomatik davomat, yakunda kredit statusi.

---

## PHASE 10 — Documents Export (1 hafta)

### M10.1 · Archive generator

- [X] Yig'ma jild ZIP: kundalik.pdf, tahlil_daftari.pdf, dars_ishlanmalari/\*, tavsiyanoma.pdf, hisobot.pdf
- [X] Celery task (uzoq vaqt olishi mumkin)
- [X] Email xabar tayyor bo'lgach

### M10.2 · Single PDF option

- [ ] PyPDF2 bilan barcha hujjatlarni bitta PDFga birlashtirish

**Demo**: Talaba "Yig'ma jildni yuklab olish" → ZIP/PDF tayyor.

---

## PHASE 11 — Dashboards & Real-time (1 hafta)

### M11.1 · Metrics service

- [ ] `/stats/*` endpointlar per role
- [ ] Caching (Redis) + TTL

### M11.2 · WebSocket gateway

- [ ] `/ws?token=...` — auth via token
- [ ] Channels: user:{id}, role:{name}, assignment:{id}
- [ ] Redis pub/sub orqali backend eventlari

### M11.3 · Dashboard UI (har rol uchun)

- [ ] Talaba: progress, davomat, yaqin deadline
- [ ] Supervizor: bugungi check-inlar, kutilayotgan tasdiqlar
- [ ] Admin: KPI cards, chart (davomat %, grade distribution)
- [ ] Super Admin: system health, qizil override queue

**Demo**: Supervizor tasdiqlaganda talaba dashboardida real-time ko'rinadi.

---

## PHASE 12 — Notifications (0.5 hafta)

- [ ] `Notification` model + prefs
- [ ] In-app (badge + list)
- [ ] Email (SMTP) — deadline yaqinlashgan, shartnoma tasdiqlandi, baho qo'yildi
- [ ] Push (FCM) — keyinroq

---

## PHASE 13 — i18n, PWA, Polish (1 hafta)

- [ ] `react-i18next` setup, uz/ru/en fayllar
- [ ] PWA manifest + service worker (offline check-in cache + sync)
- [ ] Empty states, loading skeletons
- [ ] Keyboard shortcuts
- [ ] Liquid glass layer (optional, feature flag)
- [ ] Accessibility audit (ARIA, contrast)

---

## PHASE 14 — Testing, CI/CD, Deploy (1 hafta)

### M14.1 · Tests

- [ ] pytest: models, services, API (80% critical path coverage)
- [ ] Playwright E2E: login, shartnoma, check-in, baholash

### M14.2 · CI (GitHub Actions)

- [ ] Lint (ruff, eslint)
- [ ] Test (pytest, vitest, playwright)
- [ ] Build docker images, push to registry

### M14.3 · CD (Ubuntu VPS)

- [ ] `infra/compose/docker-compose.prod.yml`
- [ ] Nginx + Certbot (Let's Encrypt)
- [ ] Database backups (pg_dump → S3/local)
- [ ] Sentry integration
- [ ] Zero-downtime deploy script

---

## PHASE 15+ — Kelajak

- HEMIS REST API integratsiyasi (manual Excel o'rniga)
- Mobile app (Expo/React Native)
- AI features (hisobot analizi, grading taklifi)
- Meilisearch full-text
- MinIO S3 storage
- Advanced analytics (Metabase yoki custom)

---

## Yakuniy Definition of Done (loyiha bo'yicha)

- [ ] 4 ta rol ham to'liq ishlaydi
- [ ] 8 ta amaliyot turi to'g'ri ishlaydi (shartnomali + shartnomasiz)
- [ ] QR shartnoma generatsiya + public verify ishlaydi
- [ ] Geo-fence davomat + qizil/yashil logika
- [ ] 100-ball sillabus baholash
- [ ] Yig'ma jild ZIP/PDF export
- [ ] HEMIS Excel import
- [ ] Real-time dashboard
- [ ] Production'da VPS da ishlaydi, HTTPS, backup
- [ ] i18n uz/ru/en
- [ ] Light/dark mode
