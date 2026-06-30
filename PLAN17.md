# Phase 17 — "Amaliyot xato va kamchiliklar" feedback'iga javob

> Manba: `AMALIYOT XATO VA KAMCHILIKLAR 29.06.2026.docx` (universitet rahbariyati, 2026-06-29).
> Hujjat ichida: 3 ta namuna skrinshot (Shartnomalar, Amaliyotlar Monitoringi, Qaydnomalar) + 2 ta Google Sheets import shabloni.
> Rasmlar **maqsadli dizayn** (target) — hozirgi sahifalar boshqacha.

## Tasdiqlangan qarorlar (2026-06-30)

1. **Shartnoma shabloni** → DOCX yuklash + `{{maydon}}` placeholder tizimi (docxtpl bilan to'ldirish).
2. **Avtomatik shartnoma** → mavjud admin oqimiga **qo'shimcha** (talaba ariza → superadmin QR tasdiq); admin qo'lda yaratish zaxira sifatida qoladi.
3. **Bajarish tartibi** → A → B → C → D (avval tezkor tuzatishlar, oxirida yirik funksiyalar).

## Import shablonlari (Google Sheets'dan o'qildi)

**Talaba shabloni (13 ustun, sarlavha 1-qator, data 2-qatordan):**
`To'liq ismi · Viloyat · Tuman · Jins · Kurs · Fakultet · Guruh · Ta'lim tili · O'quv yili · Semestr · Bitiruvchi · Mutaxassislik · Ta'lim shakli`
- ⚠️ **"Talaba id" / "HEMIS id" ustuni YO'Q** — tizim o'zi "amaliyot id" generatsiya qiladi.
- Kursda `5-kurs` qiymati bor. Ta'lim shaklida `Sirtqi`, `Kunduzgi`, `Ikkinchi oliy (sirtqi)` bor. Mutaxassislik = kod (masalan `5111200`).

**O'qituvchi shabloni (5 ustun, sarlavha 3-qatorda, namuna 4-qator o'chiriladi):**
`FISh (To'liq ismi sharifi) · Fakultet · Kafedra · Lavozim · E-pochta`
- ⚠️ Yagona `FISh` ustuni (hozirgi parser familiya/ism alohida kutadi).

---

## Gap-tahlil

| # | Talab | Holat | Hozirgi fayl | Kerakli ish |
|---|---|---|---|---|
| 1.1.1 | Shartnoma shablonlari (yuklash + maydon + CRUD) | 🔴 YO'Q | `app/templates/contracts/*.html` (hard-coded) | DOCX yuklash tizimi |
| 1.1.2 | Shartnomalar list (rasm1) | 🟡 QISMAN | `routes/dashboard/admin/contracts.tsx` | tab-status, ustun, Arxiv |
| 1.1.3 | Amaliyotlar Monitoringi (rasm2) | 🟡 QISMAN | `routes/dashboard/admin/assignments.tsx` | filtrlar + tab nomlari |
| 1.1.4 | Qaydnomalar (rasm3) | 🔴 YO'Q | `routes/dashboard/admin/reports.tsx` (boshqa) | yangi sahifa + aggregatsiya |
| 1.1.5 | Amaliyot dasturlari filtri (shakl+kurs) | 🟡 QISMAN | `routes/dashboard/admin/practice-types.tsx` | ta'lim shakli + kurs filtr |
| 1.2 | Admin = super admin minus | 🟢 BOR | `components/admin/admin-sidebar.tsx:155` | yangi menyularga gating |
| 1.3 | Supervisor yakuniy PDF | 🟢 BOR | `services/supervisor_report.py` | qaydnoma formatiga moslash |
| 2.1 | Talaba → Admin murojaat | 🔴 YO'Q | — | yangi message tizimi |
| 2.2 | Avtomatik shartnoma + ilova | 🔴 YO'Q | `services/contract.py` | ariza oqimi + appendix |
| 2.3 | Guruh tanlash bug | 🔴 BUG | `components/admin/students/student-form-dialog.tsx:79` | `academicYearId` qo'shish |
| 2.4 | O'qituvchi import shabloni | 🟡 MOS EMAS | `services/supervisor_import.py:34` | FISh yagona ustun |
| 2.5 | Talaba import shabloni | 🟡 MOS EMAS | `services/hemis.py:33` | talaba id'siz, amaliyot id |
| 2.6 | Login/parol eksport (HEMIS→amaliyot id) | 🟡 QISMAN | `schemas/hemis.py:12` | rename + Excel |
| 2.7 | 5-kurs | 🔴 YO'Q | `hemis.py:89`, `exports.py:36`, frontend `[1,2,3,4]` | 1-5 |

---

## Bosqich A — Tezkor tuzatishlar (~1-2 kun)

### A1. Guruh tanlash bug
- `apps/web/src/components/admin/students/student-form-dialog.tsx:79` — `useGroups({directionId})` ga aktiv `academicYearId` (va kerak bo'lsa `course`) qo'shish; `students-filters.tsx:22-30` to'g'ri namuna.
- Fakultet → yo'nalish → guruh kaskadini va `useGroups` hook API filtrini tekshirish.

### A2. 5-kurs qo'llab-quvvatlash
- Backend: `services/hemis.py:_parse_course` → `1 <= c <= 5`; `api/v1/exports.py` (course Query `le=5`), `api/v1/academic.py:180` (`le=5`).
- Model: `models/group.py` `course` izohi `1..5`.
- Frontend: kurs ro'yxati `[1,2,3,4,5]` (filtrlar, formalar, `practice-types`).

### A3. "HEMIS id" → "amaliyot id"
- `schemas/hemis.py:12-16` `hemis_id` → `amaliyot_id`.
- Eksport CSV/UI (`hemis-import-dialog.tsx:73-91`), dialog matnlari, `student.py` taqdimoti.
- ⚠️ DB ustuni nomini o'zgartirish shart emas — faqat tashqi taqdimot/label (migration kerak bo'lsa minimal).

---

## Bosqich B — Import/eksport shablonlari (~2-3 kun)

### B1. Talaba import parseri (yangi 13-ustun)
- `services/hemis.py` HEADER_MAP — "talaba id" majburiyligini olib tashlash; amaliyot id auto-gen.
- Ta'lim shakli qiymatlari: `Kunduzgi/Kechki/Sirtqi/Ikkinchi oliy (sirtqi)` normalizatsiya.
- 5-kurs + "5-kurs" matnini parse.

### B2. O'qituvchi import parseri (5-ustun)
- `services/supervisor_import.py` — yagona `FISh` ustuni (split → familiya/ism/sharif yoki yaxlit saqlash).
- Sarlavha (1-2 qator title/note) + namuna (4-qator) avtomatik skip.
- Ustunlar: FISh, Fakultet, Kafedra, Lavozim, E-pochta.

### B3. Namuna shablon yuklab olish
- Ikkala import dialogida "Namuna shablonni yuklab olish" tugmasi (statik .xlsx yoki backend generatsiya).

### B4. Login/parol Excel eksporti
- `exports.py` / `hemis-import-dialog.tsx` — amaliyot id + to'liq ma'lumot (FISh, guruh, kurs, mutaxassislik, login, parol) bilan Excel.

---

## Bosqich C — Monitoring & Qaydnomalar sahifalari (~4-6 kun)

### C1. Amaliyotlar Monitoringi (rasm2)
- `assignments.tsx` — filtr qo'shish: O'quv yili, Mutaxassislik, Kurs, Guruh (backend `practice_assignments.py` mos Query'lar).
- Status tab: Barchasi / Yangi / Faol / Rad etilgan / Tugatilgan.
- Excel eksport saqlanadi.

### C2. Shartnomalar list (rasm1)
- `contracts.tsx` — tab-status (Barchasi/Yangi/Imzolangan/Rad etilgan/Arxiv).
- Ustunlar: №, Shartnoma raqami, Kompaniya nomi, O'quv yili/muddat, Yaratilgan sana, Shartnoma PDF, Holat.
- Backend: `ContractStatus` ga `archived` qo'shish (kerak bo'lsa).

### C3. Yangi Qaydnomalar sahifa (rasm3)
- Yangi route `/admin/qaydnomalar` + sidebar element.
- Backend: aggregatsiya endpoint — har bir tugagan amaliyot uchun Davomat %, Korxona bahosi, Qaydnoma bahosi.
- Ustunlar: №, Talaba, Mutaxassislik, Guruh, Kurs, Amaliyot nomi, Korxona, Muddat, Davomat %, Korxona bahosi, Qaydnoma bahosi.
- Filtrlar: Ta'lim turi, Ta'lim shakli, Mutaxassislik, Kurs, Guruh, Rahbar, Boshlanish/Tugash sanasi.
- Tugmalar: Excel yuklab olish + "Baholash qaydnomasi" PDF.

### C4. Amaliyot dasturlari filtri
- `practice-types.tsx` — ta'lim shakli (kunduzgi/kechki/sirtqi) + kurs filtri.

### C5. Supervisor PDF
- `services/supervisor_report.py` — Korxona bahosi + Qaydnoma bahosi alohida maydonlar.

---

## Bosqich D — Yirik yangi funksiyalar (~1.5-2 hafta)

### D1. Shartnoma shablon tizimi (DOCX)
- Yangi model `ContractTemplate` (id, nomi, practice_type, docx_file, placeholder ro'yxati, faol).
- Endpoint: `GET/POST/PATCH/DELETE /api/v1/contract-templates/` (Super Admin).
- DOCX to'ldirish: `docxtpl` (jinja2-for-docx) + DOCX→PDF (LibreOffice headless yoki docx2pdf).
- Placeholder belgilash UI (super admin shablon yuklab, maydonlarni nomlaydi).
- Mavjud hard-coded HTML shablonlardan migratsiya.

### D2. Avtomatik shartnoma (talaba ariza oqimi)
- Talaba profilga birinchi kirganda: obyekt joylashuvi + rahbar telefon raqami + ariza yuborish formasi.
- Workflow: ariza → superadmin ko'radi → QR bilan imzolab tasdiqlaydi → shartnoma generatsiya.
- Ko'p talaba bir hududga: **ilova (appendix)** — talaba ism, yo'nalish, kurs ro'yxati bilan.
- Admin qo'lda yaratish oqimi saqlanadi (qo'shimcha).

### D3. Talaba → Admin murojaat (chat)
- Yangi model `Inquiry`/`Message` (sender, recipient/admin, body, status, created_at).
- Endpoint: `POST/GET /api/v1/inquiries/`.
- Talaba UI: kichik chat (faqat xato/savol). Admin UI: murojaatlar inbox.

---

## Texnik eslatmalar

- DOCX→PDF uchun infra qarori kerak (LibreOffice container'da yoki docx2pdf). Hozir WeasyPrint (HTML→PDF) ishlatiladi — DOCX yo'li alohida.
- Har yangi model: Alembic migration + Pydantic schema + frontend types regen.
- Yangi menyularni RBAC bilan to'g'ri gating qilish (shablon = Super Admin; monitoring/qaydnoma = admin+super).
- UI matnlar o'zbek tilida.
