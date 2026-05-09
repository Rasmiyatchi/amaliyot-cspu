# Phase 16 — Stakeholder feedback'iga javoban katta yangilash

> Manba: 2026-05-03 voice transkriptlari (universitet rahbariyati). Deploy qilingach kelgan birinchi katta feedback to'plami.

## Maqsad

Real foydalanish boshlangach kelib chiqqan kamchiliklarni to'g'rilash va MVP'ni "real production"ga aylantirish:
- Yangi entity'lar: Documents (regulations/programs), Final Reports
- Auth sxemasi yangilanishi (auto-generated login)
- Sidebar restrukturatsiyasi (admin gruppalash + supervisor yangi layout)
- Topshiriq oqimini qattiqlashtirish (deadline majburiy)
- Hamma joyda yakka qo'shish + tahrirlash imkoniyati
- RBAC aniqlashtirish (admin cheklovlari)
- Audit log

## Bosqichlar (priority bo'yicha)

### 16.1 HEMIS branding olib tashlash (kichik)
- "HEMIS Import" → "Excel Import" (talabalar sahifasi)
- "HEMIS sync" → "Sinxronizatsiya"
- Backend funksionallik **o'zgarmaydi** — faqat UI matn
- Komponent nomlarini ham yangilash (`HemisImportDialog` → `StudentsImportDialog`)
- ~30 daqiqa

### 16.2 Topshiriqqa majburiy deadline + bayon (kichik)
- Backend: `task` modelida `due_date` allaqachon bor — schema'da `required` qilish, `description` ham `min_length=1`
- Frontend: TasksAddDialog — har bir tanlangan template uchun deadline picker majburiy
- Validatsiya: deadline o'tmagan kun bo'lishi shart
- ~1 soat

### 16.3 Talaba yakka qo'shish forma (o'rta)
- Yangi: `StudentFormDialog` komponenti — admin ekan bossa ochiladi
- Maydonlar: full_name, hemis_id, faculty/direction/group/course, contact, status
- Backend `POST /students` allaqachon bor — frontendni ulash
- Excel import bilan birga tugma turadi
- ~1.5 soat

### 16.4 Task template CRUD (o'rta)
- Yangi: `TaskTemplateFormDialog` — yaratish/tahrirlash
- Maydonlar: practice_type, course, semester, category, title, description, default_max_score
- DELETE endpoint yo'q bo'lsa qo'shamiz (Cascade behavior'ni hisobga olib)
- Hozir read-only sahifani CRUD'ga aylantiramiz
- ~2 soat

### 16.5 Document entity (regulations + programs) (katta)
- **Backend**:
  - Yangi model: `Document` — `id, kind ('regulation'|'program'), title, description, practice_type_id (nullable), file_attachment_id, created_by, created_at`
  - Migration
  - Endpoints: `GET/POST/PATCH/DELETE /api/v1/documents/`, filter by kind
  - File upload integratsiyasi (uploads servis allaqachon bor)
- **Frontend**:
  - Admin sahifasi: `/admin/documents` — list + upload form (kind tab'lari)
  - Supervizor sahifasi: `/supervisor/documents` — read-only ko'rish + yuklab olish
- ~4 soat

### 16.6 Yakuniy hisobot entity + archive gate (katta)
- **Backend**:
  - Yangi model: `FinalReport` — `id, assignment_id (FK, unique), title, file_attachment_id, status ('draft'|'submitted'|'approved'|'rejected'), reviewer_id (super_admin), reviewer_note, submitted_at, reviewed_at`
  - Endpoints: talaba submit, super admin tasdiq/rad
  - Archive ZIP endpoint'ga **gate**: report.status='approved' bo'lmasa 403
- **Frontend**:
  - Talaba dashboard: "Yakuniy hisobot" kartasi (yuklash + holat)
  - Super admin sahifasi: `/admin/reports` — kelayotgan hisobotlar ro'yxati, tasdiq/rad
  - Archive tugmasi disabled bo'lib turadi report approved bo'lmaguncha
- ~5 soat

### 16.7 Sidebar restrukturatsiya (katta)
- **Admin sidebar gruppalash**:
  ```
  - Bosh sahifa
  - Akademik
  - Amaliyotlar (gruppa)
    - Amaliyot turlari
    - Normativ hujjatlar (yangi)
    - Amaliyot dasturlari (yangi)
    - Biriktirishlar
  - Obyektlar
  - Rahbarlar
  - Talabalar
  - Shartnomalar
  - Davomat
  - Topshiriqlar (gruppa)
    - Topshiriq shablonlari
    - Berilgan topshiriqlar (yangi)
  - Hisobotlar (yangi)
  - Adminlar
  - Audit log (yangi, super admin)
  - Sozlamalar
  ```
- **Supervisor yangi layout** (sidebar bilan, hozirgi single-page replace):
  ```
  - Bosh sahifa
  - Amaliyotlar
    - Amaliyot turlari (read-only)
    - Normativ hujjatlar
    - Amaliyot dasturlari
    - Faol biriktirishlar
  - Talabalarim
  - Davomat (tasdiqlash)
  - Topshiriqlar
  - Hisobotlar
  - Baholar
  ```
- ~3 soat

### 16.8 Login auto-generation (katta, ehtiyot bilan)
- **Backend**:
  - `User.username` formatini o'zgartirish: `2500NNNNNNNN` (12 raqam, prefiks env'dan: `LOGIN_YEAR_PREFIX="25"`)
  - Excel import paytida har talaba uchun:
    1. 12 raqamli login generatsiya: `25` + `00` + sequence number (8 digit)
    2. `password = login` (bir xil)
    3. `must_change_password=True` flag DB'da
  - Yangi field: `User.must_change_password: bool` + migration
  - Login muvaffaqiyatli bo'lganda `must_change_password=True` bo'lsa → frontend "parol almashtir" sahifasiga
  - Admin "parolni reset qilish" tugmasi: avto qayta-yaratadi va `must_change_password=True`
- **Frontend**:
  - Yangi sahifa: `/change-password` (must_change_password=True bo'lsa redirect)
  - Login flow: response'da flag bo'lsa → redirect
  - Admin student detail dialog'da "Parolni reset qilish" tugmasi
- **Migration strategy**: eski 123 ta talaba **qoladi eski login bilan** (HEMIS ID + pasport). Yangi import qilganlar yangi sxema bo'yicha. Hech qachon "hammasini bir vaqtda migratsiya" qilinmaydi.
- ~5 soat

### 16.9 Grading scale per practice type (o'rta)
- **Backend**:
  - `PracticeType` modeliga JSON field: `grading_weights: {attendance, events, tasks, defense}` (yig'indisi 100)
  - Default: `4_plus_2_school` → `{attendance: 10, events: 20, tasks: 60, defense: 10}`
  - Migration + migration data filling
  - Schema validation: yig'indi har doim 100
- **Frontend**:
  - Practice types sahifasiga edit forma — super admin har turga 4 ta og'irlik kiritadi
  - Supervisor baho qo'yish UI'siga shu og'irliklar ko'rsatiladi (read-only)
- ~2 soat

### 16.10 Filtrlar kengaytirish (o'rta)
- Hozirgi filterlar: students (faculty, direction, group, course, status, search)
- Qo'shiladi:
  - **Talabalar**: practice_type, has_active_assignment, assignment_status, has_attendance_issues
  - **Davomat**: practice_type, organization, status (red/yellow/green), date range
  - **Biriktirishlar**: practice_type, course, status, organization, supervisor
  - **Shartnomalar**: status, practice_type, date range, organization
  - **Topshiriqlar**: course, semester, category, supervisor (kim bergan)
- Frontend: collapsible "Kengaytirilgan filter" paneli har sahifada
- ~3 soat

### 16.11 Kundalik/Dars tahlil → faqat PDF (o'rta)
- **Backend**:
  - `Journal` va `LessonAnalysis` schema: `content` field optional/deprecated, `file_attachment_id` required
  - Migration: eski yozuvlarga `content` saqlanib qoladi (ko'rsatish uchun), lekin yangi yozuvlar PDF talab qiladi
  - LessonAnalysis: yangi field'lar `class_name`, `group_name` (yoki avto-talaba'dan oladi), `analysis_date`
- **Frontend**:
  - JournalFormDialog: matn maydoni o'chiriladi, faqat date picker + PDF upload
  - AnalysisFormDialog: matn → PDF, sinf/guruh/sana ko'rsatiladi (talabadan avto)
- ~2 soat

### 16.12 Audit log (o'rta)
- **Backend**:
  - Yangi model: `AuditLog` — `id, actor_user_id, actor_role, action ('create'|'update'|'delete'|'approve'|...), entity_type, entity_id, before_json, after_json, ip, user_agent, created_at`
  - SQLAlchemy event listener — hamma model'larga (yoki muhim model'lar ro'yxatiga)
  - Endpoint: `GET /api/v1/audit-log/` — super admin only, filter (actor, action, entity, date range)
- **Frontend**:
  - Sahifa: `/admin/audit-log` (super admin only)
  - Table: vaqt, kim, nima qildi, qaysi entity, oldingi/yangi qiymat (JSON diff)
  - Filter: aktor, action, sana
- ~4 soat

### 16.13 Universal edit tugmasi (kichik audit + qo'shish)
- Audit: hamma detail dialog/sahifa — top-right'da "Edit" tugmasi
- Qaysi entity'larda yo'q yoki noto'g'ri — to'g'rilash
- Permission: super admin to'liq, admin cheklangan (RBAC bilan)
- ~1.5 soat

### 16.14 Admin RBAC qattiqlashtirish (o'rta)
- Admin **mumkin emas**:
  - Davomat override (`POST /attendance/.../override`)
  - Boshqa adminlarni o'chirish (super admin only)
  - System settings o'zgartirish
- Admin **mumkin**:
  - Shartnoma yaratish + universitet tomonidan tasdiqlash (super admin singari)
  - Topshiriq berish, deadline qo'yish
  - Hisobotlarni ko'rish (read-only — tasdiq super admin'da)
- Backend RBAC dekoratorlarini audit qilish va yangilash
- Frontend: admin'da yo'q tugmalarni hide qilish
- ~2.5 soat

---

## Taxminiy vaqt

| Bosqich | Hajmi | Soat |
|---|---|---|
| 16.1 HEMIS removal | XS | 0.5 |
| 16.2 Task deadline | S | 1 |
| 16.3 Student single-add | M | 1.5 |
| 16.4 Task template CRUD | M | 2 |
| 16.5 Documents entity | L | 4 |
| 16.6 Final report + gate | L | 5 |
| 16.7 Sidebar restructure | L | 3 |
| 16.8 Login auto-gen | L | 5 |
| 16.9 Grading scale | M | 2 |
| 16.10 Filter expansion | M | 3 |
| 16.11 PDF-only diary/analysis | M | 2 |
| 16.12 Audit log | M | 4 |
| 16.13 Universal edit | S | 1.5 |
| 16.14 Admin RBAC | M | 2.5 |
| **JAMI** | | **~37 soat** |

Real ishchi vaqti: 4-6 ta sessiyada (har biri ~6-8 soat).

## Bajarish tartibi

Sessiya 1 (bugun): **16.1, 16.2, 16.3, 16.4** — quick wins (~5 soat)
Sessiya 2: **16.5, 16.7** — Documents + sidebar (~7 soat)
Sessiya 3: **16.6, 16.11** — Final report + PDF migration (~7 soat)
Sessiya 4: **16.8, 16.9** — Auth refactor + grading (~7 soat)
Sessiya 5: **16.10, 16.13, 16.14** — Filter + edit + RBAC (~7 soat)
Sessiya 6: **16.12** — Audit log (~4 soat)

## Deploy

Har sessiya yakunida:
1. Lokal: typecheck + git push
2. VPS: `git pull && dc up -d --build`
3. Migratsiya avto-bajariladi (api Dockerfile CMD)
4. Foydalanuvchi tekshiradi
